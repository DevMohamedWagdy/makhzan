<?php

namespace Tests\Feature\Api\V1\Affiliate\Auth;

use App\Models\Affiliate;
use App\Models\Store;
use App\Notifications\AffiliateResetPasswordNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class AffiliatePasswordResetControllerTest extends TestCase
{
    use RefreshDatabase;

    private const FORGOT_URL = '/api/v1/affiliate/auth/forgot-password';

    private const RESET_URL = '/api/v1/affiliate/auth/reset-password';

    private const GENERIC_MESSAGE = 'إذا كان الحساب موجوداً، ستصلك رسالة بها رابط لتعيين كلمة مرور جديدة خلال دقائق.';

    /**
     * Requests a link and returns the plain token captured from the notification.
     */
    private function requestToken(Affiliate $affiliate): string
    {
        Notification::fake();

        $this->postJson(self::FORGOT_URL, ['store_slug' => $affiliate->store->slug, 'email' => $affiliate->email])->assertOk();

        $token = null;
        Notification::assertSentTo($affiliate, AffiliateResetPasswordNotification::class, function (AffiliateResetPasswordNotification $notification) use (&$token): bool {
            $token = $notification->token;

            return true;
        });

        return $token;
    }

    /**
     * @return array<string, mixed>
     */
    private function resetPayload(Affiliate $affiliate, string $token, array $overrides = []): array
    {
        return [
            'store_slug' => $affiliate->store->slug,
            'affiliate_id' => $affiliate->id,
            'token' => $token,
            'password' => 'BrandNew2026',
            'password_confirmation' => 'BrandNew2026',
            ...$overrides,
        ];
    }

    public function test_forgot_password_emails_a_store_scoped_link(): void
    {
        Notification::fake();
        $affiliate = Affiliate::factory()->create(['email' => 'sara@example.com']);

        $this->postJson(self::FORGOT_URL, ['store_slug' => $affiliate->store->slug, 'email' => 'sara@example.com'])
            ->assertOk()
            ->assertExactJson(['message' => self::GENERIC_MESSAGE]);

        Notification::assertSentTo($affiliate, AffiliateResetPasswordNotification::class, function (AffiliateResetPasswordNotification $notification) use ($affiliate): bool {
            return $notification->resetUrl($affiliate) === url("/{$affiliate->store->slug}/affiliates/reset-password")."?id={$affiliate->id}&token={$notification->token}";
        });
        $this->assertDatabaseHas('affiliate_password_reset_tokens', ['affiliate_id' => $affiliate->id]);
    }

    public function test_forgot_password_ignores_email_case(): void
    {
        Notification::fake();
        $affiliate = Affiliate::factory()->create(['email' => 'sara@example.com']);

        $this->postJson(self::FORGOT_URL, ['store_slug' => $affiliate->store->slug, 'email' => 'SARA@example.com'])->assertOk();

        Notification::assertSentTo($affiliate, AffiliateResetPasswordNotification::class);
    }

    public function test_sends_nothing_but_responds_identically_for_accounts_that_cannot_reset(): void
    {
        Notification::fake();
        $pending = Affiliate::factory()->pending()->create(['email' => 'pending@example.com']);
        $frozen = Affiliate::factory()->frozen()->create(['email' => 'frozen@example.com']);
        $otherStore = Store::factory()->create();

        $requests = [
            ['store_slug' => $pending->store->slug, 'email' => $pending->email],
            ['store_slug' => $frozen->store->slug, 'email' => $frozen->email],
            ['store_slug' => $otherStore->slug, 'email' => $frozen->email],
            ['store_slug' => $otherStore->slug, 'email' => 'nobody@example.com'],
        ];

        foreach ($requests as $payload) {
            $this->postJson(self::FORGOT_URL, $payload)->assertOk()->assertExactJson(['message' => self::GENERIC_MESSAGE]);
        }

        Notification::assertNothingSent();
    }

    public function test_repeat_request_within_a_minute_does_not_send_a_second_email(): void
    {
        Notification::fake();
        $affiliate = Affiliate::factory()->create(['email' => 'sara@example.com']);
        $payload = ['store_slug' => $affiliate->store->slug, 'email' => $affiliate->email];

        $this->postJson(self::FORGOT_URL, $payload)->assertOk();
        $this->postJson(self::FORGOT_URL, $payload)->assertOk();

        Notification::assertSentToTimes($affiliate, AffiliateResetPasswordNotification::class, 1);
    }

    public function test_forgot_password_rejects_unknown_store(): void
    {
        $this->postJson(self::FORGOT_URL, ['store_slug' => 'no-such-store', 'email' => 'sara@example.com'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['store_slug' => 'المتجر غير موجود']);
    }

    public function test_reset_with_valid_token_sets_password_signs_out_everywhere_and_consumes_token(): void
    {
        $affiliate = Affiliate::factory()->create(['email' => 'sara@example.com']);
        $session = $affiliate->issueToken(remember: true);
        $token = $this->requestToken($affiliate);

        $this->postJson(self::RESET_URL, $this->resetPayload($affiliate, $token))
            ->assertOk()
            ->assertJsonPath('message', 'تم تعيين كلمة المرور الجديدة، يمكنك تسجيل الدخول الآن.');

        $this->assertTrue(Hash::check('BrandNew2026', $affiliate->fresh()->password));
        $this->assertNull(PersonalAccessToken::findToken($session));
        $this->assertDatabaseMissing('affiliate_password_reset_tokens', ['affiliate_id' => $affiliate->id]);

        $this->postJson(self::RESET_URL, $this->resetPayload($affiliate, $token, ['password' => 'Another2026', 'password_confirmation' => 'Another2026']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('token');
    }

    public function test_reset_gives_imported_affiliates_their_first_password(): void
    {
        $affiliate = Affiliate::factory()->create(['email' => 'imported@example.com', 'password' => null]);
        $token = $this->requestToken($affiliate);

        $this->postJson(self::RESET_URL, $this->resetPayload($affiliate, $token))->assertOk();

        $this->postJson('/api/v1/affiliate/auth/login', ['store_slug' => $affiliate->store->slug, 'email' => $affiliate->email, 'password' => 'BrandNew2026'])
            ->assertOk();
    }

    public function test_reset_rejects_a_wrong_token(): void
    {
        $affiliate = Affiliate::factory()->create(['email' => 'sara@example.com']);
        $this->requestToken($affiliate);

        $this->postJson(self::RESET_URL, $this->resetPayload($affiliate, 'not-the-token'))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['token' => 'رابط إعادة التعيين غير صالح أو منتهي الصلاحية']);
        $this->assertTrue(Hash::check('password1', $affiliate->fresh()->password));
    }

    public function test_reset_rejects_an_expired_token(): void
    {
        $affiliate = Affiliate::factory()->create(['email' => 'sara@example.com']);
        $token = $this->requestToken($affiliate);

        $this->travel(61)->minutes();

        $this->postJson(self::RESET_URL, $this->resetPayload($affiliate, $token))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('token');
    }

    public function test_reset_rejects_a_token_used_against_another_stores_slug(): void
    {
        $affiliate = Affiliate::factory()->create(['email' => 'sara@example.com']);
        $token = $this->requestToken($affiliate);
        $otherStore = Store::factory()->create();

        $this->postJson(self::RESET_URL, $this->resetPayload($affiliate, $token, ['store_slug' => $otherStore->slug]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('token');
    }

    public function test_reset_validates_the_new_password(): void
    {
        $affiliate = Affiliate::factory()->create(['email' => 'sara@example.com']);

        $this->postJson(self::RESET_URL, $this->resetPayload($affiliate, 'whatever', ['password' => 'short', 'password_confirmation' => 'short']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['password' => 'كلمة المرور يجب أن تكون ٨ أحرف على الأقل وتحتوي على حروف وأرقام']);
    }

    public function test_forgot_password_is_rate_limited(): void
    {
        $affiliate = Affiliate::factory()->create();
        $payload = ['store_slug' => $affiliate->store->slug, 'email' => $affiliate->email];

        foreach (range(1, 3) as $attempt) {
            $this->postJson(self::FORGOT_URL, $payload)->assertOk();
        }

        $this->postJson(self::FORGOT_URL, $payload)->assertTooManyRequests();
    }
}
