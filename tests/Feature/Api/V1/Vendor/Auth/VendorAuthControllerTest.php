<?php

namespace Tests\Feature\Api\V1\Vendor\Auth;

use App\Models\Store;
use App\Models\Vendor;
use App\Notifications\EmailVerificationCodeNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\PersonalAccessToken;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class VendorAuthControllerTest extends TestCase
{
    use RefreshDatabase;

    private const LOGIN_URL = '/api/v1/vendor/auth/login';

    private const REGISTER_URL = '/api/v1/vendor/auth/register';

    private const VERIFY_URL = '/api/v1/vendor/auth/verify-email';

    /**
     * @return array<string, mixed>
     */
    private function registrationPayload(array $overrides = []): array
    {
        return array_replace_recursive([
            'vendor' => [
                'full_name' => 'محمد أحمد علي',
                'phone' => '010 1234 5678',
                'email' => 'New.Vendor@Example.com',
                'password' => 'StorePass2026',
                'password_confirmation' => 'StorePass2026',
            ],
            'store' => [
                'name' => 'نور للأزياء',
                'slug' => 'noor-style',
                'governorate_id' => 'alexandria',
                'city_id' => 'smouha',
            ],
        ], $overrides);
    }

    public function test_login_with_email_returns_token_and_vendor_with_store(): void
    {
        $vendor = Vendor::factory()->withStore()->create(['email' => 'owner@example.com']);

        $response = $this->postJson(self::LOGIN_URL, ['email' => 'OWNER@example.com', 'password' => 'password1']);

        $response->assertOk()
            ->assertJsonPath('vendor.vendor_id', $vendor->id)
            ->assertJsonPath('vendor.store.store_id', $vendor->store->id)
            ->assertJsonPath('vendor.store.url', config('makhzan.storefront_url').'/'.$vendor->store->slug)
            ->assertJsonStructure(['token', 'vendor' => ['full_name', 'phone', 'email', 'store' => ['slug', 'logo_url']]]);
        $this->assertTrue(PersonalAccessToken::findToken($response->json('token'))->can(Vendor::TOKEN_ABILITY));
    }

    public function test_login_with_a_phone_number_is_rejected(): void
    {
        Vendor::factory()->withStore()->create(['phone' => '01012345678']);

        $this->postJson(self::LOGIN_URL, ['email' => '01012345678', 'password' => 'password1'])
            ->assertJsonValidationErrors(['email' => 'صيغة البريد الإلكتروني غير صحيحة']);
    }

    public function test_remember_me_issues_30_day_token_and_default_issues_12_hour_token(): void
    {
        $this->freezeSecond();
        Vendor::factory()->withStore()->create(['email' => 'owner@example.com']);

        $remembered = $this->postJson(self::LOGIN_URL, ['email' => 'owner@example.com', 'password' => 'password1', 'remember' => true]);
        $session = $this->postJson(self::LOGIN_URL, ['email' => 'owner@example.com', 'password' => 'password1']);

        $this->assertTrue(PersonalAccessToken::findToken($remembered->json('token'))->expires_at->equalTo(now()->addDays(30)));
        $this->assertTrue(PersonalAccessToken::findToken($session->json('token'))->expires_at->equalTo(now()->addHours(12)));
    }

    public function test_wrong_password_returns_422_with_arabic_message(): void
    {
        Vendor::factory()->withStore()->create(['email' => 'owner@example.com']);

        $this->postJson(self::LOGIN_URL, ['email' => 'owner@example.com', 'password' => 'wrong-pass1'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email' => 'البريد الإلكتروني أو كلمة المرور غير صحيحة']);
    }

    public function test_login_returns_429_after_five_failed_attempts(): void
    {
        Vendor::factory()->withStore()->create(['email' => 'owner@example.com']);

        foreach (range(1, 5) as $attempt) {
            $this->postJson(self::LOGIN_URL, ['email' => 'owner@example.com', 'password' => 'wrong-pass1'])->assertUnprocessable();
        }

        $this->postJson(self::LOGIN_URL, ['email' => 'owner@example.com', 'password' => 'password1'])
            ->assertTooManyRequests()
            ->assertJsonValidationErrors('email');
    }

    public function test_register_creates_vendor_and_store_and_signs_in_after_the_emailed_code(): void
    {
        Storage::fake('public');
        Notification::fake();

        $response = $this->post(self::REGISTER_URL, $this->registrationPayload([
            'store' => ['logo' => UploadedFile::fake()->image('logo.png', 512, 512)],
        ]), ['Accept' => 'application/json']);

        $response->assertCreated()
            ->assertJsonPath('verification_required', true)
            ->assertJsonPath('email', 'ne********@example.com')
            ->assertJsonMissingPath('token');

        $vendor = Vendor::firstWhere('email', 'new.vendor@example.com');
        $this->assertSame('01012345678', $vendor->phone);
        $this->assertSame('smouha', $vendor->store->city_id);
        $this->assertFalse($vendor->hasVerifiedEmail());
        Storage::disk('public')->assertExists($vendor->store->logo_path);

        $code = null;
        Notification::assertSentTo($vendor, EmailVerificationCodeNotification::class, function (EmailVerificationCodeNotification $notification) use (&$code): bool {
            $code = $notification->code;

            return true;
        });

        $signIn = $this->postJson(self::VERIFY_URL, ['challenge' => $response->json('challenge'), 'code' => $code])
            ->assertOk()
            ->assertJsonPath('vendor.email', 'new.vendor@example.com')
            ->assertJsonPath('vendor.store.slug', 'noor-style');

        $this->assertTrue($vendor->fresh()->hasVerifiedEmail());
        $this->assertNotNull(PersonalAccessToken::findToken($signIn->json('token')));
    }

    public function test_register_with_empty_payload_returns_arabic_errors_for_required_fields(): void
    {
        $this->postJson(self::REGISTER_URL, [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'vendor.full_name' => 'أدخل اسمك بالكامل',
                'vendor.phone' => 'أدخل رقم الهاتف / الواتساب',
                'vendor.email' => 'أدخل البريد الإلكتروني',
                'vendor.password' => 'أدخل كلمة المرور',
                'store.name' => 'أدخل اسم المتجر',
                'store.slug' => 'اختر رابطاً لمتجرك',
                'store.governorate_id' => 'اختر المحافظة',
                'store.city_id' => 'اختر المدينة',
            ]);
    }

    public function test_register_rejects_existing_email_and_phone(): void
    {
        Vendor::factory()->withStore()->create(['email' => 'new.vendor@example.com', 'phone' => '01012345678']);

        $this->postJson(self::REGISTER_URL, $this->registrationPayload())
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'vendor.email' => 'البريد الإلكتروني مسجل بالفعل',
                'vendor.phone' => 'رقم الهاتف مسجل بالفعل',
            ]);
    }

    /**
     * @return array<string, array{string}>
     */
    public static function unavailableSlugs(): array
    {
        return [
            'reserved word' => ['dashboard'],
            'leading and trailing dashes' => ['--bad--'],
            'too short' => ['ab'],
        ];
    }

    #[DataProvider('unavailableSlugs')]
    public function test_register_rejects_reserved_or_malformed_slug(string $slug): void
    {
        $this->postJson(self::REGISTER_URL, $this->registrationPayload(['store' => ['slug' => $slug]]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('store.slug');
    }

    public function test_register_rejects_taken_slug(): void
    {
        Store::factory()->create(['slug' => 'noor-style']);

        $this->postJson(self::REGISTER_URL, $this->registrationPayload())
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['store.slug' => 'هذا الرابط محجوز، جرّب اسماً آخر']);
    }

    public function test_register_rejects_city_outside_selected_governorate(): void
    {
        $this->postJson(self::REGISTER_URL, $this->registrationPayload(['store' => ['governorate_id' => 'cairo', 'city_id' => 'smouha']]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['store.city_id' => 'المدينة لا تتبع المحافظة المختارة']);
    }

    public function test_register_rejects_svg_logo(): void
    {
        Storage::fake('public');
        $svg = UploadedFile::fake()->createWithContent('logo.svg', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

        $this->post(self::REGISTER_URL, $this->registrationPayload(['store' => ['logo' => $svg]]), ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('store.logo');
        $this->assertDatabaseCount('vendors', 0);
    }

    public function test_register_rejects_mismatched_password_confirmation(): void
    {
        $this->postJson(self::REGISTER_URL, $this->registrationPayload(['vendor' => ['password_confirmation' => 'Different2026']]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['vendor.password' => 'كلمتا المرور غير متطابقتين']);
    }

    public function test_me_returns_authenticated_vendor(): void
    {
        $vendor = $this->actingAsVendor();

        $this->getJson('/api/v1/vendor/auth/me')
            ->assertOk()
            ->assertJsonPath('data.vendor_id', $vendor->id)
            ->assertJsonPath('data.store.store_id', $vendor->store->id);
    }

    public function test_me_returns_401_without_token(): void
    {
        $this->getJson('/api/v1/vendor/auth/me')->assertUnauthorized();
    }

    public function test_logout_revokes_the_current_token(): void
    {
        $vendor = Vendor::factory()->withStore()->create();
        $token = $vendor->issueToken(remember: false);

        $this->withToken($token)->postJson('/api/v1/vendor/auth/logout')->assertNoContent();

        $this->assertNull(PersonalAccessToken::findToken($token));
    }
}
