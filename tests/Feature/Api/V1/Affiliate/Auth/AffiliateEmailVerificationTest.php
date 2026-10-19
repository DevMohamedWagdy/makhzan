<?php

namespace Tests\Feature\Api\V1\Affiliate\Auth;

use App\Models\Affiliate;
use App\Notifications\EmailVerificationCodeNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * Affiliates sign in with their email and confirm it with an emailed 6-digit code first.
 */
class AffiliateEmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
    }

    private function signIn(Affiliate $affiliate): TestResponse
    {
        return $this->postJson('/api/v1/affiliate/auth/login', ['store_slug' => $affiliate->store->slug, 'email' => $affiliate->email, 'password' => 'password1']);
    }

    private function lastCode(Affiliate $affiliate): string
    {
        return Notification::sent($affiliate, EmailVerificationCodeNotification::class)->last()->code;
    }

    public function test_unverified_affiliates_get_a_code_instead_of_a_token(): void
    {
        $affiliate = Affiliate::factory()->unverified()->create();

        $challenge = $this->signIn($affiliate)
            ->assertOk()
            ->assertJsonPath('verification_required', true)
            ->assertJsonMissingPath('token')
            ->json('challenge');

        $this->postJson('/api/v1/affiliate/auth/verify-email', ['challenge' => $challenge, 'code' => $this->lastCode($affiliate)])
            ->assertOk()
            ->assertJsonPath('affiliate.affiliate_id', $affiliate->id)
            ->assertJsonStructure(['token']);

        $this->assertTrue($affiliate->fresh()->hasVerifiedEmail());
        $this->signIn($affiliate)->assertOk()->assertJsonStructure(['token']);
    }

    public function test_a_vendor_challenge_cannot_be_used_to_sign_in_as_an_affiliate(): void
    {
        $vendor = $this->actingAsVendor();
        $vendor->forceFill(['email_verified_at' => null])->save();
        $challenge = $this->postJson('/api/v1/vendor/auth/login', ['email' => $vendor->email, 'password' => 'password1'])->json('challenge');
        $code = Notification::sent($vendor, EmailVerificationCodeNotification::class)->last()->code;

        $this->postJson('/api/v1/affiliate/auth/verify-email', ['challenge' => $challenge, 'code' => $code])->assertJsonValidationErrors('code');
    }

    public function test_frozen_affiliates_are_stopped_at_the_code_step(): void
    {
        $affiliate = Affiliate::factory()->unverified()->create();
        $challenge = $this->signIn($affiliate)->json('challenge');
        $affiliate->forceFill(['status' => 'frozen'])->save();

        $this->postJson('/api/v1/affiliate/auth/verify-email', ['challenge' => $challenge, 'code' => $this->lastCode($affiliate)])->assertJsonValidationErrors('code');
    }

    public function test_affiliates_need_a_unique_email_within_the_store(): void
    {
        $vendor = $this->actingAsVendor();
        Affiliate::factory()->for($vendor)->for($vendor->store)->create(['email' => 'sara@example.com']);
        $payload = [
            'full_name' => 'سارة محمود إبراهيم',
            'phone' => '01055556666',
            'password' => 'Affiliate2026',
            'password_confirmation' => 'Affiliate2026',
            'tier' => 'general',
            'payout_method' => ['type' => 'vodafone_cash', 'account_name' => 'سارة محمود', 'account_number' => '01055556666'],
        ];

        $this->postJson('/api/v1/vendor/affiliates', $payload)->assertJsonValidationErrors(['email' => 'أدخل البريد الإلكتروني للمسوق، سيستخدمه لتسجيل الدخول']);
        $this->postJson('/api/v1/vendor/affiliates', [...$payload, 'email' => 'SARA@example.com'])->assertJsonValidationErrors(['email' => 'البريد الإلكتروني مسجل لمسوق آخر بالفعل']);
    }

    public function test_changing_an_affiliates_email_asks_for_a_code_at_their_next_sign_in(): void
    {
        $vendor = $this->actingAsVendor();
        $affiliate = Affiliate::factory()->for($vendor)->for($vendor->store)->create();

        $this->putJson("/api/v1/vendor/affiliates/{$affiliate->id}", [
            'full_name' => $affiliate->full_name,
            'phone' => $affiliate->phone,
            'email' => 'new@example.com',
            'tier' => $affiliate->tier->value,
            'payout_method' => ['type' => 'vodafone_cash', 'account_name' => 'سارة', 'account_number' => '01055556666'],
        ])->assertOk();

        $this->assertFalse($affiliate->fresh()->hasVerifiedEmail());
    }
}
