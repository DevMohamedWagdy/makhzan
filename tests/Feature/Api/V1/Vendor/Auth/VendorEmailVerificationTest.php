<?php

namespace Tests\Feature\Api\V1\Vendor\Auth;

use App\Models\Vendor;
use App\Notifications\EmailVerificationCodeNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Notification;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * A vendor whose email isn't confirmed gets a 6-digit code at sign-in instead of a token.
 */
class VendorEmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();

        // Serialize like the real cache stores, which refuse to unserialize objects (cache.serializable_classes).
        config(['cache.stores.array.serialize' => true]);
        Cache::forgetDriver('array');
    }

    private function signIn(Vendor $vendor): TestResponse
    {
        return $this->postJson('/api/v1/vendor/auth/login', ['email' => $vendor->email, 'password' => 'password1']);
    }

    private function lastCode(Vendor $vendor): string
    {
        return Notification::sent($vendor, EmailVerificationCodeNotification::class)->last()->code;
    }

    public function test_unverified_vendors_get_a_code_instead_of_a_token(): void
    {
        $vendor = Vendor::factory()->unverified()->withStore()->create();

        $challenge = $this->signIn($vendor)
            ->assertOk()
            ->assertJsonPath('verification_required', true)
            ->assertJsonMissingPath('token')
            ->json('challenge');

        $this->assertMatchesRegularExpression('/^\d{6}$/', $this->lastCode($vendor));

        $this->postJson('/api/v1/vendor/auth/verify-email', ['challenge' => $challenge, 'code' => $this->lastCode($vendor)])
            ->assertOk()
            ->assertJsonStructure(['token', 'vendor' => ['vendor_id', 'store']]);

        $this->assertTrue($vendor->fresh()->hasVerifiedEmail());
        $this->signIn($vendor)->assertOk()->assertJsonStructure(['token']);
    }

    public function test_wrong_codes_are_rejected_and_lock_the_code_after_five_tries(): void
    {
        $vendor = Vendor::factory()->unverified()->withStore()->create();
        $challenge = $this->signIn($vendor)->json('challenge');
        $wrongCode = $this->lastCode($vendor) === '000000' ? '111111' : '000000';

        foreach (range(1, 5) as $attempt) {
            $this->postJson('/api/v1/vendor/auth/verify-email', ['challenge' => $challenge, 'code' => $wrongCode])
                ->assertJsonValidationErrors(['code' => 'كود التفعيل غير صحيح']);
        }

        $this->postJson('/api/v1/vendor/auth/verify-email', ['challenge' => $challenge, 'code' => $this->lastCode($vendor)])
            ->assertJsonValidationErrors(['code' => 'انتهت صلاحية الكود. اطلب كوداً جديداً.']);
        $this->assertFalse($vendor->fresh()->hasVerifiedEmail());
    }

    public function test_codes_expire_and_can_be_resent_after_a_cooldown(): void
    {
        $vendor = Vendor::factory()->unverified()->withStore()->create();
        $challenge = $this->signIn($vendor)->json('challenge');
        $firstCode = $this->lastCode($vendor);

        $this->postJson('/api/v1/vendor/auth/verify-email/resend', ['challenge' => $challenge])->assertTooManyRequests();

        $this->travel(11)->minutes();
        $this->postJson('/api/v1/vendor/auth/verify-email', ['challenge' => $challenge, 'code' => $firstCode])->assertJsonValidationErrors('code');

        $this->postJson('/api/v1/vendor/auth/verify-email/resend', ['challenge' => $challenge])->assertOk()->assertJsonPath('challenge', $challenge);
        Notification::assertSentToTimes($vendor, EmailVerificationCodeNotification::class, 2);

        $this->postJson('/api/v1/vendor/auth/verify-email', ['challenge' => $challenge, 'code' => $this->lastCode($vendor)])->assertOk();
    }

    public function test_a_code_cached_with_carbon_dates_counts_as_expired_and_can_be_resent_at_once(): void
    {
        $vendor = Vendor::factory()->unverified()->withStore()->create();
        $challenge = 'legacy-challenge';
        Cache::put('email-verification:vendor:'.hash('sha256', $challenge), [
            'account_id' => $vendor->id,
            'remember' => false,
            'code_hash' => 'unknown',
            'code_expires_at' => now()->addMinutes(10),
            'sent_at' => now(),
            'attempts' => 0,
        ], now()->addHour());

        $this->postJson('/api/v1/vendor/auth/verify-email', ['challenge' => $challenge, 'code' => '123456'])
            ->assertJsonValidationErrors(['code' => 'انتهت صلاحية الكود. اطلب كوداً جديداً.']);

        $this->postJson('/api/v1/vendor/auth/verify-email/resend', ['challenge' => $challenge])->assertOk();
        $this->postJson('/api/v1/vendor/auth/verify-email', ['challenge' => $challenge, 'code' => $this->lastCode($vendor)])->assertOk();
    }

    public function test_an_unknown_challenge_is_rejected(): void
    {
        $this->postJson('/api/v1/vendor/auth/verify-email', ['challenge' => 'nope', 'code' => '123456'])->assertJsonValidationErrors('code');
    }

    public function test_changing_the_email_asks_for_a_code_at_the_next_sign_in(): void
    {
        $vendor = Vendor::factory()->withStore()->create();
        $this->actingAsVendor($vendor);

        $this->putJson('/api/v1/vendor/auth/profile', ['full_name' => $vendor->full_name, 'phone' => $vendor->phone, 'email' => 'new@example.com'])->assertOk();

        $this->assertFalse($vendor->fresh()->hasVerifiedEmail());
    }
}
