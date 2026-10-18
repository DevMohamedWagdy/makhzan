<?php

namespace Tests\Feature\Api\V1\Vendor;

use App\Models\Admin;
use App\Models\StoreRole;
use App\Models\SupportTicket;
use App\Models\SupportTicketAttachment;
use App\Models\SupportTicketMessage;
use App\Models\Vendor;
use App\Notifications\AdminAlertNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SupportTicketTest extends TestCase
{
    use RefreshDatabase;

    private Vendor $vendor;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
        Storage::fake(SupportTicketAttachment::DISK);
        $this->vendor = $this->actingAsVendor();
    }

    public function test_opens_a_ticket_with_attachments_stored_privately_and_alerts_the_support_team(): void
    {
        $support = Admin::factory()->withPermissions(['tickets.view'])->create();
        $finance = Admin::factory()->withPermissions(['subscriptions.view'])->create();

        $response = $this->post('/api/v1/vendor/support-tickets', [
            'subject' => 'لا تظهر الطلبات الجديدة',
            'type' => 'problem',
            'body' => 'منذ الصباح لا تظهر الطلبات في اللوحة',
            'attachments' => [UploadedFile::fake()->image('screen.png'), UploadedFile::fake()->create('report.pdf', 300, 'application/pdf')],
        ], ['Accept' => 'application/json']);

        $response->assertCreated()
            ->assertJsonPath('data.subject', 'لا تظهر الطلبات الجديدة')
            ->assertJsonPath('data.type', 'problem')
            ->assertJsonPath('data.status', 'open')
            ->assertJsonPath('data.last_reply_by', 'vendor')
            ->assertJsonCount(1, 'data.messages')
            ->assertJsonCount(2, 'data.messages.0.attachments')
            ->assertJsonPath('data.messages.0.attachments.0.is_image', true)
            ->assertJsonMissingPath('data.messages.0.attachments.0.path');

        $ticket = SupportTicket::query()->sole();
        $this->assertSame($this->vendor->store->id, $ticket->store_id);
        $attachment = SupportTicketAttachment::query()->where('original_name', 'report.pdf')->sole();
        Storage::disk(SupportTicketAttachment::DISK)->assertExists($attachment->path);
        $this->assertStringStartsWith("support-tickets/{$ticket->store_id}/{$ticket->id}/", $attachment->path);

        Notification::assertSentTo($support, AdminAlertNotification::class, fn (AdminAlertNotification $alert): bool => $alert->event === AdminAlertNotification::TICKET_OPENED && $alert->details['ticket_id'] === $ticket->id);
        Notification::assertNotSentTo($finance, AdminAlertNotification::class);
    }

    public function test_validates_the_ticket_and_its_attachments(): void
    {
        $this->postJson('/api/v1/vendor/support-tickets', ['type' => 'complaint'])
            ->assertJsonValidationErrors(['subject', 'type', 'body']);

        $this->post('/api/v1/vendor/support-tickets', [
            'subject' => 'ملفات',
            'type' => 'suggestion',
            'body' => 'تفاصيل',
            'attachments' => [UploadedFile::fake()->create('tool.exe', 10), UploadedFile::fake()->create('big.pdf', 6000, 'application/pdf')],
        ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['attachments.0' => 'نوع الملف غير مدعوم', 'attachments.1' => 'حجم الملف يتجاوز 5 ميجابايت']);

        $this->post('/api/v1/vendor/support-tickets', [
            'subject' => 'ملفات كثيرة',
            'type' => 'suggestion',
            'body' => 'تفاصيل',
            'attachments' => array_map(fn (int $index) => UploadedFile::fake()->image("photo-{$index}.jpg"), range(1, 6)),
        ], ['Accept' => 'application/json'])->assertJsonValidationErrors('attachments');

        $this->assertDatabaseCount('support_tickets', 0);
    }

    public function test_lists_only_the_stores_own_tickets_with_filters(): void
    {
        $store = $this->vendor->store;
        SupportTicket::factory()->for($store)->create(['subject' => 'مشكلة في الشحن', 'last_activity_at' => now()->subDay()]);
        SupportTicket::factory()->for($store)->suggestion()->closed()->create(['subject' => 'اقتراح تقارير']);
        SupportTicket::factory()->create(['subject' => 'تذكرة متجر آخر']);

        $this->getJson('/api/v1/vendor/support-tickets')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.subject', 'اقتراح تقارير')
            ->assertJsonPath('summary', ['open' => 1, 'closed' => 1, 'total' => 2]);

        $this->getJson('/api/v1/vendor/support-tickets?status=open')->assertJsonCount(1, 'data')->assertJsonPath('data.0.subject', 'مشكلة في الشحن');
        $this->getJson('/api/v1/vendor/support-tickets?type=suggestion')->assertJsonCount(1, 'data')->assertJsonPath('data.0.subject', 'اقتراح تقارير');
        $this->getJson('/api/v1/vendor/support-tickets?search='.urlencode('الشحن'))->assertJsonCount(1, 'data');
    }

    public function test_another_stores_ticket_and_its_attachments_are_not_found(): void
    {
        $foreign = SupportTicket::factory()->create();
        $message = SupportTicketMessage::factory()->for($foreign, 'ticket')->create();
        $attachment = SupportTicketAttachment::factory()->for($message, 'message')->create();

        $this->getJson("/api/v1/vendor/support-tickets/{$foreign->id}")->assertNotFound();
        $this->postJson("/api/v1/vendor/support-tickets/{$foreign->id}/messages", ['body' => 'مرحباً'])->assertNotFound();
        $this->get("/api/v1/vendor/support-tickets/{$foreign->id}/attachments/{$attachment->id}", ['Accept' => 'application/json'])->assertNotFound();
        $this->assertSame(1, SupportTicketMessage::query()->count());
    }

    public function test_downloads_an_attachment_only_through_its_own_ticket(): void
    {
        $ticket = SupportTicket::factory()->for($this->vendor->store)->create();
        $other = SupportTicket::factory()->for($this->vendor->store)->create();
        $foreignAttachment = SupportTicketAttachment::factory()->for(SupportTicketMessage::factory()->for(SupportTicket::factory(), 'ticket'), 'message')->create();
        Storage::disk(SupportTicketAttachment::DISK)->put('support-tickets/invoice.pdf', 'PDF-CONTENT');
        $attachment = SupportTicketAttachment::factory()->for(SupportTicketMessage::factory()->for($ticket, 'ticket'), 'message')->create(['path' => 'support-tickets/invoice.pdf']);

        $response = $this->get("/api/v1/vendor/support-tickets/{$ticket->id}/attachments/{$attachment->id}");
        $response->assertOk()->assertDownload('invoice.pdf');
        $this->assertSame('PDF-CONTENT', $response->streamedContent());

        $this->getJson("/api/v1/vendor/support-tickets/{$other->id}/attachments/{$attachment->id}")->assertNotFound();
        $this->getJson("/api/v1/vendor/support-tickets/{$ticket->id}/attachments/{$foreignAttachment->id}")->assertNotFound();
    }

    public function test_replies_to_an_open_ticket_and_alerts_the_support_team(): void
    {
        $support = Admin::factory()->create();
        $ticket = SupportTicket::factory()->for($this->vendor->store)->create(['last_reply_by' => SupportTicket::AUTHOR_ADMIN]);

        $this->post("/api/v1/vendor/support-tickets/{$ticket->id}/messages", ['attachments' => [UploadedFile::fake()->image('proof.jpg')]], ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJsonPath('data.author_type', 'vendor')
            ->assertJsonPath('data.body', null)
            ->assertJsonCount(1, 'data.attachments');

        $this->postJson("/api/v1/vendor/support-tickets/{$ticket->id}/messages", [])->assertJsonValidationErrors('body');

        $this->assertSame(SupportTicket::AUTHOR_VENDOR, $ticket->fresh()->last_reply_by);
        Notification::assertSentTo($support, AdminAlertNotification::class, fn (AdminAlertNotification $alert): bool => $alert->event === AdminAlertNotification::TICKET_VENDOR_REPLIED);
    }

    public function test_a_closed_ticket_takes_no_replies(): void
    {
        $ticket = SupportTicket::factory()->for($this->vendor->store)->closed()->create();

        $this->postJson("/api/v1/vendor/support-tickets/{$ticket->id}/messages", ['body' => 'ما زالت المشكلة قائمة'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['body' => 'هذه التذكرة مغلقة']);

        $this->assertSame(0, SupportTicketMessage::query()->count());
        Notification::assertNothingSent();
    }

    public function test_staff_need_support_permissions(): void
    {
        $store = $this->vendor->store;
        $ticket = SupportTicket::factory()->for($store)->create();
        $viewer = StoreRole::factory()->for($store)->allowing(['support.view'])->create();
        $none = StoreRole::factory()->for($store)->allowing(['orders.view'])->create();

        Sanctum::actingAs($store->staff()->create(['full_name' => 'Viewer', 'phone' => '01055554444', 'email' => 'viewer@x.test', 'password' => 'Staff2026pass', 'role_id' => $viewer->id]), [Vendor::TOKEN_ABILITY]);
        $this->getJson('/api/v1/vendor/support-tickets')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson("/api/v1/vendor/support-tickets/{$ticket->id}")->assertOk();
        $this->postJson("/api/v1/vendor/support-tickets/{$ticket->id}/messages", ['body' => 'رد'])->assertForbidden();
        $this->postJson('/api/v1/vendor/support-tickets', ['subject' => 'عنوان', 'type' => 'problem', 'body' => 'تفاصيل'])->assertForbidden();

        Sanctum::actingAs($store->staff()->create(['full_name' => 'Other', 'phone' => '01055554445', 'email' => 'other@x.test', 'password' => 'Staff2026pass', 'role_id' => $none->id]), [Vendor::TOKEN_ABILITY]);
        $this->getJson('/api/v1/vendor/support-tickets')->assertForbidden();
        $this->getJson("/api/v1/vendor/support-tickets/{$ticket->id}")->assertForbidden();
    }

    public function test_a_suspended_store_can_still_reach_support(): void
    {
        $this->vendor->store->forceFill(['suspended_at' => now(), 'suspension_reason' => 'مراجعة'])->save();
        $this->actingAsVendor($this->vendor->fresh());

        $this->getJson('/api/v1/vendor/orders')->assertForbidden();
        $this->postJson('/api/v1/vendor/support-tickets', ['subject' => 'إيقاف المتجر', 'type' => 'problem', 'body' => 'لماذا تم إيقاف متجري؟'])->assertCreated();
    }
}
