<?php

namespace Tests\Feature;

use App\Models\Affiliate;
use App\Models\Vendor;
use App\Notifications\AffiliateRegisteredNotification;
use App\Notifications\VendorResetPasswordNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class LocalizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_responds_in_arabic_by_default(): void
    {
        $this->withHeader('Accept-Language', '')
            ->postJson('/api/v1/vendor/auth/login', [])
            ->assertUnprocessable()
            ->assertHeader('Content-Language', 'ar')
            ->assertJsonValidationErrors(['identifier' => 'أدخل البريد الإلكتروني أو رقم الهاتف']);
    }

    public function test_responds_in_english_when_asked(): void
    {
        $this->withHeader('Accept-Language', 'en-US,en;q=0.9')
            ->postJson('/api/v1/vendor/auth/login', [])
            ->assertUnprocessable()
            ->assertHeader('Content-Language', 'en')
            ->assertJsonValidationErrors(['identifier' => 'Enter your email address or phone number']);
    }

    public function test_falls_back_to_arabic_for_unsupported_languages(): void
    {
        $this->withHeader('Accept-Language', 'fr-FR')
            ->postJson('/api/v1/vendor/auth/login', [])
            ->assertHeader('Content-Language', 'ar');
    }

    public function test_remembers_the_language_a_vendor_uses_for_later_emails(): void
    {
        $vendor = $this->actingAsVendor();

        $this->withHeader('Accept-Language', 'en')->getJson('/api/v1/vendor/auth/me')->assertOk();

        $this->assertSame('en', $vendor->fresh()->preferredLocale());
    }

    public function test_emails_are_sent_in_the_recipients_language(): void
    {
        Notification::fake();
        $vendor = Vendor::factory()->withStore()->create(['preferred_locale' => 'en']);

        $vendor->notify(new VendorResetPasswordNotification('token'));

        Notification::assertSentTo($vendor, VendorResetPasswordNotification::class, function (VendorResetPasswordNotification $notification, array $channels, Vendor $notifiable, string $locale): bool {
            return $locale === 'en';
        });
    }

    public function test_dashboard_notifications_are_shown_in_the_readers_language(): void
    {
        $vendor = $this->actingAsVendor();
        $affiliate = Affiliate::factory()->for($vendor)->for($vendor->store)->pending()->create(['full_name' => 'Sara Mahmoud']);
        $vendor->notify(new AffiliateRegisteredNotification($affiliate));

        $this->withHeader('Accept-Language', 'en')
            ->getJson('/api/v1/vendor/notifications')
            ->assertJsonPath('data.0.message', 'Sara Mahmoud applied to join your affiliate team and is waiting for your approval');

        $this->withHeader('Accept-Language', 'ar')
            ->getJson('/api/v1/vendor/notifications')
            ->assertJsonPath('data.0.message', 'Sara Mahmoud أرسل طلب انضمام لفريق المسوقين وينتظر موافقتك');
    }
}
