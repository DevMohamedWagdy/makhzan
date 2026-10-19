<?php

namespace Tests\Feature\Api\V1\Vendor\Auth;

use App\Models\Vendor;
use App\Notifications\VendorResetPasswordNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class PasswordResetControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_forgot_password_emails_a_reset_link(): void
    {
        Notification::fake();
        $vendor = Vendor::factory()->withStore()->create(['email' => 'owner@example.com']);

        $this->postJson('/api/v1/vendor/auth/forgot-password', ['email' => 'OWNER@example.com'])
            ->assertOk()
            ->assertJsonPath('channel', 'email');

        Notification::assertSentTo($vendor, VendorResetPasswordNotification::class, function (VendorResetPasswordNotification $notification) use ($vendor): bool {
            return str_starts_with($notification->resetUrl($vendor), url('/reset-password').'?token=');
        });
    }

    public function test_forgot_password_for_unknown_account_returns_the_same_response_and_sends_nothing(): void
    {
        Notification::fake();
        $known = Vendor::factory()->withStore()->create(['email' => 'known@example.com']);

        $knownResponse = $this->postJson('/api/v1/vendor/auth/forgot-password', ['email' => 'known@example.com'])->json();
        $unknownResponse = $this->postJson('/api/v1/vendor/auth/forgot-password', ['email' => 'nobody@example.com'])->json();

        $this->assertSame($knownResponse, $unknownResponse);
        Notification::assertSentTimes(VendorResetPasswordNotification::class, 1);
        Notification::assertSentTo($known, VendorResetPasswordNotification::class);
    }

    public function test_reset_password_with_valid_token_changes_password_and_revokes_tokens(): void
    {
        $vendor = Vendor::factory()->withStore()->create(['email' => 'owner@example.com']);
        $vendor->issueToken(remember: true);
        $token = Password::broker('vendors')->createToken($vendor);

        $this->postJson('/api/v1/vendor/auth/reset-password', [
            'token' => $token,
            'email' => 'owner@example.com',
            'password' => 'BrandNew2026',
            'password_confirmation' => 'BrandNew2026',
        ])->assertOk();

        $this->assertTrue(Hash::check('BrandNew2026', $vendor->fresh()->password));
        $this->assertSame(0, $vendor->tokens()->count());
    }

    public function test_reset_password_with_invalid_token_returns_422(): void
    {
        Vendor::factory()->withStore()->create(['email' => 'owner@example.com']);

        $this->postJson('/api/v1/vendor/auth/reset-password', [
            'token' => 'not-a-real-token',
            'email' => 'owner@example.com',
            'password' => 'BrandNew2026',
            'password_confirmation' => 'BrandNew2026',
        ])->assertUnprocessable()->assertJsonValidationErrors(['email' => 'رابط إعادة التعيين غير صالح أو منتهي الصلاحية']);
    }
}
