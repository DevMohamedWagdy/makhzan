<?php

namespace Tests\Feature\Api\V1\Affiliate\Auth;

use App\Enums\CommissionType;
use App\Models\Affiliate;
use App\Models\Store;
use App\Models\Vendor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\PersonalAccessToken;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AffiliateAuthControllerTest extends TestCase
{
    use RefreshDatabase;

    private const LOGIN_URL = '/api/v1/affiliate/auth/login';

    private const ME_URL = '/api/v1/affiliate/auth/me';

    public function test_login_with_phone_returns_affiliate_token_and_records_activity(): void
    {
        $this->freezeSecond();
        $affiliate = Affiliate::factory()->create(['phone' => '01055556666']);

        $response = $this->postJson(self::LOGIN_URL, [
            'store_slug' => $affiliate->store->slug,
            'identifier' => '010 5555 6666',
            'password' => 'password1',
        ]);

        $response->assertOk()
            ->assertJsonPath('affiliate.affiliate_id', $affiliate->id)
            ->assertJsonPath('affiliate.store.slug', $affiliate->store->slug);
        $this->assertSame([Affiliate::TOKEN_ABILITY], PersonalAccessToken::findToken($response->json('token'))->abilities);
        $this->assertTrue($affiliate->fresh()->last_active_at->equalTo(now()));
    }

    public function test_login_with_email_succeeds(): void
    {
        $affiliate = Affiliate::factory()->create(['email' => 'sara@example.com']);

        $this->postJson(self::LOGIN_URL, ['store_slug' => $affiliate->store->slug, 'identifier' => 'SARA@example.com', 'password' => 'password1'])
            ->assertOk();
    }

    public function test_login_is_scoped_to_the_given_store(): void
    {
        $affiliate = Affiliate::factory()->create(['phone' => '01055556666']);
        $otherStore = Store::factory()->create();

        $this->postJson(self::LOGIN_URL, ['store_slug' => $otherStore->slug, 'identifier' => '01055556666', 'password' => 'password1'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['identifier' => 'رقم الهاتف / البريد الإلكتروني أو كلمة المرور غير صحيحة']);
        $this->assertSame(0, $affiliate->tokens()->count());
    }

    public function test_login_with_wrong_password_returns_generic_422(): void
    {
        $affiliate = Affiliate::factory()->create();

        $this->postJson(self::LOGIN_URL, ['store_slug' => $affiliate->store->slug, 'identifier' => $affiliate->phone, 'password' => 'wrong-pass1'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['identifier' => 'رقم الهاتف / البريد الإلكتروني أو كلمة المرور غير صحيحة']);
    }

    public function test_pending_and_frozen_status_is_revealed_only_after_the_correct_password(): void
    {
        $pending = Affiliate::factory()->pending()->create();
        $frozen = Affiliate::factory()->frozen()->create();

        $this->postJson(self::LOGIN_URL, ['store_slug' => $pending->store->slug, 'identifier' => $pending->phone, 'password' => 'wrong-pass1'])
            ->assertJsonValidationErrors(['identifier' => 'رقم الهاتف / البريد الإلكتروني أو كلمة المرور غير صحيحة']);

        $this->postJson(self::LOGIN_URL, ['store_slug' => $pending->store->slug, 'identifier' => $pending->phone, 'password' => 'password1'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['identifier' => 'طلب انضمامك قيد المراجعة، وستتمكن من الدخول فور موافقة صاحب المتجر.']);

        $this->postJson(self::LOGIN_URL, ['store_slug' => $frozen->store->slug, 'identifier' => $frozen->phone, 'password' => 'password1'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['identifier' => 'حسابك موقوف حالياً، تواصل مع المتجر لمزيد من التفاصيل.']);

        $this->assertSame(0, $pending->tokens()->count() + $frozen->tokens()->count());
    }

    public function test_imported_affiliate_without_password_cannot_log_in(): void
    {
        $affiliate = Affiliate::factory()->create(['password' => null]);

        $this->postJson(self::LOGIN_URL, ['store_slug' => $affiliate->store->slug, 'identifier' => $affiliate->phone, 'password' => ''])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('password');
        $this->postJson(self::LOGIN_URL, ['store_slug' => $affiliate->store->slug, 'identifier' => $affiliate->phone, 'password' => 'anything1'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('identifier');
    }

    public function test_login_rejects_unknown_store(): void
    {
        $this->postJson(self::LOGIN_URL, ['store_slug' => 'no-such-store', 'identifier' => '01055556666', 'password' => 'password1'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['store_slug' => 'المتجر غير موجود']);
    }

    public function test_login_returns_429_after_five_failed_attempts(): void
    {
        $affiliate = Affiliate::factory()->create();
        $credentials = ['store_slug' => $affiliate->store->slug, 'identifier' => $affiliate->phone];

        foreach (range(1, 5) as $attempt) {
            $this->postJson(self::LOGIN_URL, [...$credentials, 'password' => 'wrong-pass1'])->assertUnprocessable();
        }

        $this->postJson(self::LOGIN_URL, [...$credentials, 'password' => 'password1'])->assertTooManyRequests();
    }

    public function test_me_returns_own_dashboard_data_without_vendor_internal_fields(): void
    {
        $affiliate = Affiliate::factory()
            ->withCustomCommission(CommissionType::Fixed, 40, 'ملاحظة داخلية للتاجر')
            ->withSales(12)
            ->create(['payout_account_number' => '01099887766']);
        Sanctum::actingAs($affiliate, [Affiliate::TOKEN_ABILITY]);

        $response = $this->getJson(self::ME_URL)
            ->assertOk()
            ->assertJsonPath('data.commission', ['type' => 'fixed', 'value' => 40])
            ->assertJsonPath('data.payout_method.account_number_last4', '7766')
            ->assertJsonPath('data.stats.orders_count', 12)
            ->assertJsonPath('data.store.slug', $affiliate->store->slug)
            ->assertJsonCount(1, 'data.referral_codes');

        $response->assertJsonMissingPath('data.commission.note')
            ->assertJsonMissingPath('data.payout_method.account_number')
            ->assertJsonMissingPath('data.frozen_reason')
            ->assertJsonMissingPath('data.source')
            ->assertJsonMissingPath('data.vendor_id');
        $this->assertStringNotContainsString('ملاحظة داخلية للتاجر', $response->getContent());
    }

    public function test_me_works_with_a_vendor_impersonation_token_even_for_a_frozen_account(): void
    {
        $affiliate = Affiliate::factory()->frozen()->create();
        Sanctum::actingAs($affiliate, [Affiliate::IMPERSONATION_ABILITY]);

        $this->getJson(self::ME_URL)->assertOk()->assertJsonPath('data.status', 'frozen');
    }

    public function test_me_returns_403_for_a_frozen_affiliates_own_token(): void
    {
        Sanctum::actingAs(Affiliate::factory()->frozen()->create(), [Affiliate::TOKEN_ABILITY]);

        $this->getJson(self::ME_URL)->assertForbidden()->assertJsonPath('message', 'حسابك غير نشط حالياً، تواصل مع المتجر.');
    }

    public function test_me_returns_403_for_a_vendor_token(): void
    {
        Sanctum::actingAs(Vendor::factory()->withStore()->create(), [Vendor::TOKEN_ABILITY]);

        $this->getJson(self::ME_URL)->assertForbidden();
    }

    public function test_affiliate_token_cannot_call_vendor_endpoints(): void
    {
        Sanctum::actingAs(Affiliate::factory()->create(), [Affiliate::TOKEN_ABILITY]);

        $this->getJson('/api/v1/vendor/affiliates')->assertForbidden();
    }

    public function test_me_returns_401_without_token(): void
    {
        $this->getJson(self::ME_URL)->assertUnauthorized();
    }

    public function test_logout_revokes_the_current_token(): void
    {
        $affiliate = Affiliate::factory()->create();
        $token = $affiliate->issueToken(remember: false);

        $this->withToken($token)->postJson('/api/v1/affiliate/auth/logout')->assertNoContent();

        $this->assertNull(PersonalAccessToken::findToken($token));
    }
}
