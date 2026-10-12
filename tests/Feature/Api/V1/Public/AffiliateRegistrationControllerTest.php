<?php

namespace Tests\Feature\Api\V1\Public;

use App\Enums\AffiliateSource;
use App\Enums\AffiliateStatus;
use App\Enums\AffiliateTier;
use App\Models\Affiliate;
use App\Models\AffiliateRegistrationLink;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AffiliateRegistrationControllerTest extends TestCase
{
    use RefreshDatabase;

    private function url(AffiliateRegistrationLink $link): string
    {
        return "/api/v1/affiliate-registration/{$link->token}";
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return array_replace_recursive([
            'full_name' => 'سارة محمود إبراهيم',
            'phone' => '010 5555 6666',
            'email' => 'sara@example.com',
            'password' => 'Affiliate2026',
            'password_confirmation' => 'Affiliate2026',
            'payout_method' => [
                'type' => 'orange_cash',
                'account_name' => 'سارة محمود',
                'account_number' => '01255556666',
            ],
        ], $overrides);
    }

    public function test_show_returns_public_store_details_and_link_terms(): void
    {
        $link = AffiliateRegistrationLink::factory()->create(['default_tier' => 'general', 'auto_approve' => false]);

        $this->getJson($this->url($link))
            ->assertOk()
            ->assertExactJson(['data' => [
                'store' => ['name' => $link->store->name, 'slug' => $link->store->slug, 'logo_url' => null],
                'tier' => 'general',
                'commission_percentage' => 8,
                'requires_approval' => true,
            ]]);
    }

    public function test_show_returns_404_for_unknown_token(): void
    {
        $this->getJson('/api/v1/affiliate-registration/not-a-token')
            ->assertNotFound()
            ->assertJsonPath('message', 'رابط التسجيل غير صالح أو متوقف حالياً');
    }

    public function test_show_returns_404_for_a_disabled_link(): void
    {
        $link = AffiliateRegistrationLink::factory()->create(['is_enabled' => false]);

        $this->getJson($this->url($link))
            ->assertNotFound()
            ->assertJsonPath('message', 'رابط التسجيل غير صالح أو متوقف حالياً');
    }

    public function test_register_with_manual_review_creates_pending_affiliate_without_referral_code(): void
    {
        $link = AffiliateRegistrationLink::factory()->create(['auto_approve' => false, 'default_tier' => 'general']);

        $response = $this->postJson($this->url($link), $this->payload());

        $response->assertCreated()->assertJson([
            'status' => 'pending',
            'requires_approval' => true,
            'referral_code' => null,
            'referral_url' => null,
        ]);

        $affiliate = Affiliate::find($response->json('affiliate_id'));
        $this->assertTrue($affiliate->store->is($link->store));
        $this->assertSame($link->store->vendor_id, $affiliate->vendor_id);
        $this->assertSame(AffiliateStatus::Pending, $affiliate->status);
        $this->assertSame(AffiliateTier::General, $affiliate->tier);
        $this->assertSame(AffiliateSource::SelfRegistration, $affiliate->source);
        $this->assertSame('01055556666', $affiliate->phone);
        $this->assertTrue(Hash::check('Affiliate2026', $affiliate->password));
        $this->assertSame(0, $affiliate->referralCodes()->count());
    }

    public function test_register_notifies_the_store_vendor_on_the_dashboard(): void
    {
        $link = AffiliateRegistrationLink::factory()->create(['auto_approve' => false]);

        $affiliateId = $this->postJson($this->url($link), $this->payload())->assertCreated()->json('affiliate_id');

        $notification = $link->store->vendor->notifications()->sole();
        $this->assertSame('affiliate_registered', $notification->type);
        $this->assertSame($affiliateId, $notification->data['affiliate_id']);
        $this->assertTrue($notification->data['requires_approval']);
        $this->assertSame('سارة محمود إبراهيم أرسل طلب انضمام لفريق المسوقين وينتظر موافقتك', $notification->data['message']);
    }

    public function test_register_with_auto_approve_creates_active_affiliate_and_returns_referral_link(): void
    {
        $link = AffiliateRegistrationLink::factory()->create(['auto_approve' => true]);

        $response = $this->postJson($this->url($link), $this->payload())
            ->assertCreated()
            ->assertJsonPath('status', 'active')
            ->assertJsonPath('requires_approval', false);

        $code = Affiliate::find($response->json('affiliate_id'))->referralCodes()->sole()->code;
        $response->assertJsonPath('referral_code', $code)
            ->assertJsonPath('referral_url', "https://makhzan.app/{$link->store->slug}?ref={$code}");
    }

    public function test_register_ignores_tier_status_and_store_sent_by_the_applicant(): void
    {
        $link = AffiliateRegistrationLink::factory()->create(['default_tier' => 'new']);
        $otherLink = AffiliateRegistrationLink::factory()->create();

        $id = $this->postJson($this->url($link), $this->payload([
            'tier' => 'vip',
            'status' => 'active',
            'store_id' => $otherLink->store_id,
            'commission_value' => 50,
        ]))->assertCreated()->json('affiliate_id');

        $affiliate = Affiliate::find($id);
        $this->assertSame(AffiliateTier::New, $affiliate->tier);
        $this->assertSame(AffiliateStatus::Pending, $affiliate->status);
        $this->assertSame($link->store_id, $affiliate->store_id);
        $this->assertNull($affiliate->commission_value);
    }

    public function test_register_through_a_disabled_link_returns_404_before_validation(): void
    {
        $link = AffiliateRegistrationLink::factory()->create(['is_enabled' => false]);

        $this->postJson($this->url($link), [])->assertNotFound();
        $this->assertDatabaseCount('affiliates', 0);
    }

    public function test_register_through_a_regenerated_old_token_returns_404(): void
    {
        $link = AffiliateRegistrationLink::factory()->create();
        $oldUrl = $this->url($link);
        $link->regenerate();

        $this->postJson($oldUrl, $this->payload())->assertNotFound();
        $this->assertDatabaseCount('affiliates', 0);
    }

    public function test_register_rejects_a_phone_already_registered_in_the_same_store(): void
    {
        $link = AffiliateRegistrationLink::factory()->create();
        Affiliate::factory()->for($link->store)->create(['phone' => '01055556666']);

        $this->postJson($this->url($link), $this->payload())
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['phone' => 'هذا الرقم مسجل بالفعل ضمن مسوقي هذا المتجر']);
    }

    public function test_register_allows_a_phone_registered_with_another_store(): void
    {
        $link = AffiliateRegistrationLink::factory()->create();
        Affiliate::factory()->create(['phone' => '01055556666']);

        $this->postJson($this->url($link), $this->payload())->assertCreated();
    }

    public function test_register_with_empty_payload_returns_arabic_messages(): void
    {
        $link = AffiliateRegistrationLink::factory()->create();

        $this->postJson($this->url($link), [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'full_name' => 'أدخل اسمك بالكامل',
                'phone' => 'أدخل رقم هاتفك',
                'password' => 'أدخل كلمة المرور',
                'payout_method' => 'اختر وسيلة السحب',
            ])
            ->assertJsonMissingValidationErrors(['tier', 'avatar']);
    }

    public function test_registration_is_rate_limited_per_ip(): void
    {
        $link = AffiliateRegistrationLink::factory()->create();

        foreach (range(1, 10) as $attempt) {
            $this->postJson($this->url($link), [])->assertUnprocessable();
        }

        $this->postJson($this->url($link), $this->payload())->assertTooManyRequests();
    }

    public function test_pending_applicant_appears_in_the_vendors_pending_list(): void
    {
        $link = AffiliateRegistrationLink::factory()->create();
        $this->postJson($this->url($link), $this->payload())->assertCreated();

        $this->actingAsVendor($link->store->vendor);

        $this->getJson('/api/v1/vendor/affiliates?status=pending')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.source', 'self_registration');
    }
}
