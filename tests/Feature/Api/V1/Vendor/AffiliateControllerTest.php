<?php

namespace Tests\Feature\Api\V1\Vendor;

use App\Enums\AffiliateSource;
use App\Enums\AffiliateStatus;
use App\Enums\AffiliateTier;
use App\Enums\PayoutMethod;
use App\Models\Affiliate;
use App\Models\Vendor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class AffiliateControllerTest extends TestCase
{
    use RefreshDatabase;

    private const URL = '/api/v1/vendor/affiliates';

    /**
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return array_replace_recursive([
            'full_name' => 'سارة محمود إبراهيم',
            'phone' => '01055556666',
            'email' => 'sara@example.com',
            'password' => 'Affiliate2026',
            'password_confirmation' => 'Affiliate2026',
            'tier' => 'general',
            'payout_method' => [
                'type' => 'vodafone_cash',
                'account_name' => 'سارة محمود',
                'account_number' => '01055556666',
            ],
        ], $overrides);
    }

    public function test_index_returns_only_the_vendors_own_affiliates_with_pagination_meta(): void
    {
        $vendor = $this->actingAsVendor();
        $own = Affiliate::factory()->for($vendor)->for($vendor->store)->count(3)->create();
        Affiliate::factory()->count(2)->create();

        $this->getJson(self::URL)
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('meta.total', 3)
            ->assertJsonPath('meta.per_page', 10)
            ->assertJsonFragment(['affiliate_id' => $own->first()->id]);
    }

    public function test_index_filters_by_status_tier_and_payout_method(): void
    {
        $vendor = $this->actingAsVendor();
        $affiliates = Affiliate::factory()->for($vendor)->for($vendor->store);
        $match = $affiliates->tier(AffiliateTier::Vip)->bankPayout()->create();
        $affiliates->tier(AffiliateTier::Vip)->create();
        $affiliates->tier(AffiliateTier::Vip)->bankPayout()->frozen()->create();

        $this->getJson(self::URL.'?status=active&tier=vip&payout_method=bank_account')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.affiliate_id', $match->id);
    }

    public function test_index_searches_by_name_phone_with_arabic_digits_and_referral_code(): void
    {
        $vendor = $this->actingAsVendor();
        $affiliate = Affiliate::factory()->for($vendor)->for($vendor->store)->create(['full_name' => 'هدى سمير', 'phone' => '01133334444']);
        Affiliate::factory()->for($vendor)->for($vendor->store)->create(['full_name' => 'أحمد علي']);
        $code = $affiliate->referralCodes()->first()->code;

        foreach (['هدى', '٠١١٣٣٣٣', strtolower($code)] as $term) {
            $this->getJson(self::URL.'?search='.urlencode($term))
                ->assertOk()
                ->assertJsonCount(1, 'data')
                ->assertJsonPath('data.0.affiliate_id', $affiliate->id);
        }
    }

    public function test_index_rejects_unknown_filter_values_with_422(): void
    {
        $this->actingAsVendor();

        $this->getJson(self::URL.'?tier=gold&per_page=500')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['tier', 'per_page']);
    }

    public function test_returns_401_without_a_token(): void
    {
        $this->getJson(self::URL)->assertUnauthorized();
    }

    public function test_returns_403_for_an_affiliate_impersonation_token(): void
    {
        $affiliate = Affiliate::factory()->create();
        Sanctum::actingAs($affiliate, [Affiliate::IMPERSONATION_ABILITY]);

        $this->getJson(self::URL)->assertForbidden();
    }

    public function test_returns_403_for_a_vendor_token_without_the_vendor_ability(): void
    {
        Sanctum::actingAs(Vendor::factory()->withStore()->create(), ['something-else']);

        $this->getJson(self::URL)->assertForbidden();
    }

    public function test_store_creates_active_affiliate_with_referral_code_and_returns_201(): void
    {
        $vendor = $this->actingAsVendor();

        $response = $this->postJson(self::URL, $this->payload());

        $response->assertCreated()
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('data.store_id', $vendor->store->id)
            ->assertJsonPath('data.payout_method.account_number', '01055556666')
            ->assertJsonPath('data.referral_codes.0.is_active', true);

        $affiliate = Affiliate::find($response->json('data.affiliate_id'));
        $this->assertSame(AffiliateSource::Manual, $affiliate->source);
        $this->assertTrue(Hash::check('Affiliate2026', $affiliate->password));
        $this->assertStringStartsWith(
            'https://makhzan.app/'.$vendor->store->slug.'?ref=MK',
            $response->json('data.referral_codes.0.url'),
        );
    }

    public function test_store_encrypts_payout_account_number_at_rest(): void
    {
        $this->actingAsVendor();

        $id = $this->postJson(self::URL, $this->payload())->json('data.affiliate_id');

        $raw = DB::table('affiliates')->where('id', $id)->value('payout_account_number');
        $this->assertNotSame('01055556666', $raw);
        $this->assertSame('01055556666', Affiliate::find($id)->payout_account_number);
    }

    public function test_store_saves_avatar_on_public_disk(): void
    {
        Storage::fake('public');
        $this->actingAsVendor();

        $response = $this->post(self::URL, $this->payload(['avatar' => UploadedFile::fake()->image('me.jpg')]), ['Accept' => 'application/json']);

        $response->assertCreated();
        Storage::disk('public')->assertExists(Affiliate::find($response->json('data.affiliate_id'))->avatar_path);
    }

    public function test_store_with_empty_payload_returns_arabic_required_messages(): void
    {
        $this->actingAsVendor();

        $this->postJson(self::URL, [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'full_name' => 'أدخل اسم المسوق بالكامل',
                'phone' => 'أدخل رقم هاتف المسوق',
                'password' => 'أدخل كلمة مرور للمسوق',
                'tier' => 'اختر شريحة المسوق',
                'payout_method' => 'اختر وسيلة السحب',
            ]);
    }

    public function test_store_rejects_phone_already_used_in_the_same_store(): void
    {
        $vendor = $this->actingAsVendor();
        Affiliate::factory()->for($vendor)->for($vendor->store)->create(['phone' => '01055556666']);

        $this->postJson(self::URL, $this->payload(['phone' => '010 5555 6666']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['phone' => 'رقم الهاتف مسجل لمسوق آخر بالفعل']);
    }

    public function test_store_allows_a_phone_used_by_another_stores_affiliate(): void
    {
        $this->actingAsVendor();
        Affiliate::factory()->create(['phone' => '01055556666']);

        $this->postJson(self::URL, $this->payload())->assertCreated();
    }

    public function test_store_requires_bank_name_for_bank_account_payouts(): void
    {
        $this->actingAsVendor();

        $this->postJson(self::URL, $this->payload(['payout_method' => ['type' => 'bank_account']]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['payout_method.bank_name' => 'أدخل اسم البنك']);
    }

    #[TestWith(['orange_cash'])]
    #[TestWith(['we_cash'])]
    #[TestWith(['etisalat_cash'])]
    public function test_store_accepts_egyptian_mobile_wallets(string $type): void
    {
        $this->actingAsVendor();

        $this->postJson(self::URL, $this->payload(['payout_method' => ['type' => $type]]))
            ->assertCreated()
            ->assertJsonPath('data.payout_method.type', $type);
    }

    public function test_store_rejects_stc_pay_which_is_no_longer_supported(): void
    {
        $this->actingAsVendor();

        $this->postJson(self::URL, $this->payload(['payout_method' => ['type' => 'stc_pay']]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['payout_method.type' => 'وسيلة سحب غير معروفة']);
    }

    public function test_store_rejects_unexpected_payout_keys(): void
    {
        $this->actingAsVendor();

        $this->postJson(self::URL, $this->payload(['payout_method' => ['commission_value' => 99]]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('payout_method');
    }

    public function test_store_ignores_attempts_to_set_status_or_commission(): void
    {
        $this->actingAsVendor();

        $id = $this->postJson(self::URL, $this->payload(['status' => 'frozen', 'commission_value' => 40, 'store_id' => 999]))
            ->assertCreated()
            ->json('data.affiliate_id');

        $affiliate = Affiliate::find($id);
        $this->assertSame(AffiliateStatus::Active, $affiliate->status);
        $this->assertNull($affiliate->commission_value);
    }

    public function test_show_returns_404_for_another_stores_affiliate(): void
    {
        $this->actingAsVendor();
        $foreign = Affiliate::factory()->create();

        $this->getJson(self::URL.'/'.$foreign->id)->assertNotFound();
    }

    public function test_update_keeps_password_when_blank_and_updates_details(): void
    {
        $vendor = $this->actingAsVendor();
        $affiliate = Affiliate::factory()->for($vendor)->for($vendor->store)->create(['phone' => '01055556666']);
        $originalHash = $affiliate->password;

        $this->putJson(self::URL.'/'.$affiliate->id, $this->payload([
            'full_name' => 'سارة محمود (معدل)',
            'password' => null,
            'password_confirmation' => null,
            'tier' => 'vip',
            'payout_method' => ['type' => 'instapay', 'account_number' => 'sara@instapay'],
        ]))->assertOk()->assertJsonPath('data.tier', 'vip');

        $affiliate->refresh();
        $this->assertSame('سارة محمود (معدل)', $affiliate->full_name);
        $this->assertSame(PayoutMethod::InstaPay, $affiliate->payout_type);
        $this->assertSame($originalHash, $affiliate->password);
    }

    public function test_update_with_new_password_rehashes_it(): void
    {
        $vendor = $this->actingAsVendor();
        $affiliate = Affiliate::factory()->for($vendor)->for($vendor->store)->create(['phone' => '01055556666']);

        $this->putJson(self::URL.'/'.$affiliate->id, $this->payload(['password' => 'Changed2026', 'password_confirmation' => 'Changed2026']))->assertOk();

        $this->assertTrue(Hash::check('Changed2026', $affiliate->fresh()->password));
    }

    public function test_update_via_multipart_method_spoofing_replaces_avatar_and_deletes_the_old_file(): void
    {
        Storage::fake('public');
        $vendor = $this->actingAsVendor();
        $old = UploadedFile::fake()->image('old.png')->store('affiliates/avatars', 'public');
        $affiliate = Affiliate::factory()->for($vendor)->for($vendor->store)->create(['phone' => '01055556666', 'avatar_path' => $old]);

        $this->post(self::URL.'/'.$affiliate->id, [
            ...$this->payload(),
            '_method' => 'PUT',
            'avatar' => UploadedFile::fake()->image('new.png'),
        ], ['Accept' => 'application/json'])->assertOk();

        Storage::disk('public')->assertMissing($old);
        Storage::disk('public')->assertExists($affiliate->fresh()->avatar_path);
    }

    public function test_update_returns_404_for_another_stores_affiliate_even_with_invalid_payload(): void
    {
        $this->actingAsVendor();
        $foreign = Affiliate::factory()->create();

        $this->putJson(self::URL.'/'.$foreign->id, [])->assertNotFound();
    }

    public function test_destroy_deletes_affiliate_and_its_referral_codes(): void
    {
        $vendor = $this->actingAsVendor();
        $affiliate = Affiliate::factory()->for($vendor)->for($vendor->store)->create();

        $this->deleteJson(self::URL.'/'.$affiliate->id)->assertNoContent();

        $this->assertModelMissing($affiliate);
        $this->assertDatabaseMissing('affiliate_referral_codes', ['affiliate_id' => $affiliate->id]);
    }

    public function test_destroy_returns_404_for_another_stores_affiliate(): void
    {
        $this->actingAsVendor();
        $foreign = Affiliate::factory()->create();

        $this->deleteJson(self::URL.'/'.$foreign->id)->assertNotFound();
        $this->assertModelExists($foreign);
    }
}
