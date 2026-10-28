<?php

namespace Tests\Feature\Notifications;

use App\Models\Vendor;
use App\Notifications\EmailVerificationCodeNotification;
use App\Notifications\StoreAlertNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Only the notifications listed in config('makhzan.mail_notifications') are emailed; the rest still reach
 * the dashboard bell.
 */
class MailNotificationLimitTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['mail.default' => 'array']);
    }

    private function sentEmails(): int
    {
        return Mail::mailer('array')->getSymfonyTransport()->messages()->count();
    }

    public function test_verification_codes_are_emailed(): void
    {
        Vendor::factory()->unverified()->create()->notify(new EmailVerificationCodeNotification('047532', 10));

        $this->assertSame(1, $this->sentEmails());
    }

    public function test_other_notifications_skip_email_but_still_reach_the_bell(): void
    {
        $vendor = Vendor::factory()->withStore()->create();

        $vendor->notify(new StoreAlertNotification(StoreAlertNotification::PASSWORD_CHANGED));

        $this->assertSame(0, $this->sentEmails());
        $this->assertSame(1, $vendor->notifications()->count());
    }

    public function test_adding_a_notification_to_the_list_turns_its_email_on(): void
    {
        config(['makhzan.mail_notifications' => [StoreAlertNotification::class]]);

        Vendor::factory()->withStore()->create()->notify(new StoreAlertNotification(StoreAlertNotification::PASSWORD_CHANGED));

        $this->assertSame(1, $this->sentEmails());
    }
}
