<?php

namespace Tests\Feature\Api\V1\Public;

use App\Models\Admin;
use App\Models\ContactMessage;
use App\Notifications\AdminAlertNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class ContactMessageControllerTest extends TestCase
{
    use RefreshDatabase;

    private const MESSAGE = [
        'full_name' => 'أحمد علي',
        'phone' => '01012345678',
        'email' => 'ahmed@example.com',
        'message' => 'أريد معرفة المزيد عن ربط شركات الشحن.',
    ];

    public function test_a_visitor_message_reaches_the_inbox_and_alerts_the_team(): void
    {
        Notification::fake();
        $admin = Admin::factory()->create();

        $this->postJson('/api/v1/site/contact-messages', self::MESSAGE)->assertCreated()->assertJsonStructure(['message']);

        $this->assertDatabaseHas('contact_messages', ['full_name' => 'أحمد علي', 'phone' => '01012345678', 'read_at' => null]);
        Notification::assertSentTo($admin, AdminAlertNotification::class, fn (AdminAlertNotification $alert): bool => $alert->event === AdminAlertNotification::CONTACT_MESSAGE);
    }

    public function test_name_phone_email_and_a_real_message_are_required(): void
    {
        $this->postJson('/api/v1/site/contact-messages', ['phone' => 'call me', 'email' => 'not-an-email', 'message' => 'hi'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['full_name', 'phone', 'email', 'message']);

        $this->postJson('/api/v1/site/contact-messages', [...self::MESSAGE, 'email' => null])->assertJsonValidationErrors(['email']);
    }

    public function test_a_filled_honeypot_is_accepted_but_not_saved(): void
    {
        $this->postJson('/api/v1/site/contact-messages', [...self::MESSAGE, 'website' => 'https://spam.example'])->assertCreated();

        $this->assertSame(0, ContactMessage::query()->count());
    }

    public function test_browsing_the_landing_page_does_not_use_up_the_form_limit(): void
    {
        foreach (range(1, 10) as $pageView) {
            $this->getJson('/api/v1/site/contact');
        }

        $this->postJson('/api/v1/site/contact-messages', self::MESSAGE)->assertCreated();
    }

    public function test_submissions_are_rate_limited(): void
    {
        foreach (range(1, 5) as $attempt) {
            $this->postJson('/api/v1/site/contact-messages', self::MESSAGE)->assertCreated();
        }

        $this->postJson('/api/v1/site/contact-messages', self::MESSAGE)->assertTooManyRequests();
    }
}
