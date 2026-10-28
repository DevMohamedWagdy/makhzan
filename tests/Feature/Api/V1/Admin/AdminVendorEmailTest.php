<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Models\ActivityLog;
use App\Models\Admin;
use App\Models\Vendor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Symfony\Component\Mime\Email;
use Tests\TestCase;

/**
 * The platform team writes an email to one merchant from the admin panel.
 */
class AdminVendorEmailTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['mail.default' => 'array']);
        Sanctum::actingAs(Admin::factory()->create(), [Admin::TOKEN_ABILITY]);
    }

    private function lastEmail(): ?Email
    {
        return Mail::mailer('array')->getSymfonyTransport()->messages()->last()?->getOriginalMessage();
    }

    public function test_sends_the_admins_subject_and_text_and_logs_it(): void
    {
        $vendor = Vendor::factory()->withStore()->create(['full_name' => 'محمد وجدي', 'email' => 'owner@example.com']);

        $this->postJson("/api/v1/admin/vendors/{$vendor->id}/email", [
            'subject' => 'تحديث مهم بخصوص متجرك',
            'body' => "الفقرة الأولى.\n\nالفقرة الثانية <b>بتنسيق</b>.",
        ])->assertOk()->assertJsonPath('message', 'تم إرسال البريد إلى owner@example.com');

        $email = $this->lastEmail();

        $this->assertSame('تحديث مهم بخصوص متجرك', $email->getSubject());
        $this->assertSame('owner@example.com', $email->getTo()[0]->getAddress());
        $this->assertMatchesRegularExpression('/<p[^>]*>الفقرة الأولى\.<\/p>/u', $email->getHtmlBody(), 'Each blank-line block is its own paragraph.');
        $this->assertStringContainsString('&lt;b&gt;بتنسيق&lt;/b&gt;', $email->getHtmlBody(), 'What the admin types is shown as text, never as HTML.');
        $this->assertStringContainsString('محمد وجدي', $email->getHtmlBody());

        $log = ActivityLog::query()->where('event', 'vendor.emailed')->sole();
        $this->assertSame($vendor->id, $log->subject_id);
        $this->assertSame('تحديث مهم بخصوص متجرك', $log->changes['new']['subject']);
    }

    public function test_needs_a_subject_and_a_text(): void
    {
        $vendor = Vendor::factory()->withStore()->create();

        $this->postJson("/api/v1/admin/vendors/{$vendor->id}/email", ['subject' => '', 'body' => ''])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['subject', 'body']);

        $this->assertNull($this->lastEmail());
    }

    public function test_a_mail_failure_comes_back_to_the_admin(): void
    {
        config(['mail.default' => 'smtp', 'mail.mailers.smtp.host' => '127.0.0.1', 'mail.mailers.smtp.port' => 1, 'mail.mailers.smtp.timeout' => 1]);
        $vendor = Vendor::factory()->withStore()->create();

        $this->postJson("/api/v1/admin/vendors/{$vendor->id}/email", ['subject' => 'مرحباً', 'body' => 'نص'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('body');

        $this->assertDatabaseMissing('activity_logs', ['event' => 'vendor.emailed']);
    }

    public function test_needs_the_permission_to_update_merchant_accounts(): void
    {
        Sanctum::actingAs(Admin::factory()->withPermissions(['vendors.view'])->create(), [Admin::TOKEN_ABILITY]);
        $vendor = Vendor::factory()->withStore()->create();

        $this->postJson("/api/v1/admin/vendors/{$vendor->id}/email", ['subject' => 'مرحباً', 'body' => 'نص'])->assertForbidden();
    }
}
