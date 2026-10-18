<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Models\Admin;
use App\Models\Store;
use App\Models\SupportTicket;
use App\Models\SupportTicketAttachment;
use App\Models\SupportTicketMessage;
use App\Models\Vendor;
use App\Notifications\SupportTicketUpdateNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SupportTicketTest extends TestCase
{
    use RefreshDatabase;

    private Store $store;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
        Storage::fake(SupportTicketAttachment::DISK);
        $this->store = Store::factory()->create(['name' => 'متجر النور']);
    }

    private function actingAsAdmin(?Admin $admin = null): Admin
    {
        $admin ??= Admin::factory()->create();
        Sanctum::actingAs($admin, [Admin::TOKEN_ABILITY]);

        return $admin;
    }

    public function test_lists_every_stores_tickets_with_filters_and_search(): void
    {
        $this->actingAsAdmin();
        $mine = SupportTicket::factory()->for($this->store)->create(['subject' => 'الدفع لا يعمل', 'last_activity_at' => now()]);
        SupportTicket::factory()->for($this->store)->closed()->suggestion()->create(['subject' => 'فكرة', 'last_activity_at' => now()->subDay()]);
        $other = SupportTicket::factory()->create(['subject' => 'الشحن متأخر', 'last_reply_by' => SupportTicket::AUTHOR_ADMIN, 'last_activity_at' => now()->subDays(2)]);

        $this->getJson('/api/v1/admin/support-tickets')
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('data.0.store.name', 'متجر النور')
            ->assertJsonPath('summary', ['open' => 2, 'closed' => 1, 'awaiting_reply' => 1, 'total' => 3])
            ->assertJsonCount(2, 'stores');

        $this->getJson('/api/v1/admin/support-tickets?status=closed')->assertJsonCount(1, 'data')->assertJsonPath('data.0.subject', 'فكرة');
        $this->getJson('/api/v1/admin/support-tickets?type=suggestion')->assertJsonCount(1, 'data');
        $this->getJson("/api/v1/admin/support-tickets?store_id={$other->store_id}")->assertJsonCount(1, 'data')->assertJsonPath('data.0.ticket_id', $other->id);
        $this->getJson('/api/v1/admin/support-tickets?awaiting_reply=1')->assertJsonCount(1, 'data')->assertJsonPath('data.0.ticket_id', $mine->id);
        $this->getJson('/api/v1/admin/support-tickets?search='.urlencode('النور'))->assertJsonCount(2, 'data');
        $this->getJson("/api/v1/admin/support-tickets?search=%23{$other->id}")->assertJsonCount(1, 'data')->assertJsonPath('data.0.ticket_id', $other->id);
    }

    public function test_shows_the_thread_and_downloads_attachments(): void
    {
        $this->actingAsAdmin();
        $ticket = SupportTicket::factory()->for($this->store)->create();
        $message = SupportTicketMessage::factory()->for($ticket, 'ticket')->create(['body' => 'التفاصيل']);
        Storage::disk(SupportTicketAttachment::DISK)->put('support-tickets/shot.png', 'PNG');
        $attachment = SupportTicketAttachment::factory()->for($message, 'message')->create(['path' => 'support-tickets/shot.png', 'original_name' => 'shot.png', 'mime_type' => 'image/png']);

        $this->getJson("/api/v1/admin/support-tickets/{$ticket->id}")
            ->assertOk()
            ->assertJsonPath('data.store.store_id', $this->store->id)
            ->assertJsonPath('data.messages.0.body', 'التفاصيل')
            ->assertJsonPath('data.messages.0.author_name', $this->store->vendor->full_name)
            ->assertJsonPath('data.messages.0.attachments.0.attachment_id', $attachment->id);

        $this->get("/api/v1/admin/support-tickets/{$ticket->id}/attachments/{$attachment->id}")->assertOk()->assertDownload('shot.png');
    }

    public function test_replies_with_files_and_notifies_the_store_owner(): void
    {
        $admin = $this->actingAsAdmin(Admin::factory()->create(['full_name' => 'سارة من الدعم']));
        $ticket = SupportTicket::factory()->for($this->store)->create();

        $this->post("/api/v1/admin/support-tickets/{$ticket->id}/messages", [
            'body' => 'تم حل المشكلة، جرّب الآن',
            'attachments' => [UploadedFile::fake()->create('steps.docx', 120, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')],
        ], ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJsonPath('data.author_type', 'admin')
            ->assertJsonPath('data.author_name', 'سارة من الدعم')
            ->assertJsonCount(1, 'data.attachments');

        $this->assertDatabaseHas('support_ticket_messages', ['ticket_id' => $ticket->id, 'admin_id' => $admin->id, 'vendor_id' => null]);
        $this->assertSame(SupportTicket::AUTHOR_ADMIN, $ticket->fresh()->last_reply_by);
        Notification::assertSentTo($this->store->vendor, SupportTicketUpdateNotification::class, fn (SupportTicketUpdateNotification $notification, array $channels): bool => $notification->event === SupportTicketUpdateNotification::REPLIED && $channels === ['mail', 'database']);
    }

    public function test_closes_and_reopens_a_ticket_notifying_the_owner_each_time(): void
    {
        $this->actingAsAdmin();
        $ticket = SupportTicket::factory()->for($this->store)->create();
        $vendor = $this->store->vendor;

        $this->postJson("/api/v1/admin/support-tickets/{$ticket->id}/close")->assertOk()->assertJsonPath('data.status', 'closed');
        $this->postJson("/api/v1/admin/support-tickets/{$ticket->id}/close")->assertJsonValidationErrors('status');
        $this->postJson("/api/v1/admin/support-tickets/{$ticket->id}/messages", ['body' => 'رد'])->assertJsonValidationErrors('body');

        // The merchant can't reply while it's closed…
        Sanctum::actingAs($vendor, [Vendor::TOKEN_ABILITY]);
        $this->postJson("/api/v1/vendor/support-tickets/{$ticket->id}/messages", ['body' => 'ما زالت المشكلة'])->assertJsonValidationErrors('body');

        // …until an admin reopens it.
        $this->actingAsAdmin();
        $this->postJson("/api/v1/admin/support-tickets/{$ticket->id}/reopen")->assertOk()->assertJsonPath('data.status', 'open')->assertJsonPath('data.closed_at', null);
        $this->postJson("/api/v1/admin/support-tickets/{$ticket->id}/reopen")->assertJsonValidationErrors('status');

        Sanctum::actingAs($vendor, [Vendor::TOKEN_ABILITY]);
        $this->postJson("/api/v1/vendor/support-tickets/{$ticket->id}/messages", ['body' => 'ما زالت المشكلة'])->assertCreated();

        Notification::assertSentTo($vendor, SupportTicketUpdateNotification::class, fn (SupportTicketUpdateNotification $notification): bool => $notification->event === SupportTicketUpdateNotification::CLOSED);
        Notification::assertSentTo($vendor, SupportTicketUpdateNotification::class, fn (SupportTicketUpdateNotification $notification): bool => $notification->event === SupportTicketUpdateNotification::REOPENED);
    }

    public function test_admin_access_follows_ticket_permissions(): void
    {
        $ticket = SupportTicket::factory()->for($this->store)->create();

        $this->actingAsAdmin(Admin::factory()->withPermissions(['stores.view'])->create());
        $this->getJson('/api/v1/admin/support-tickets')->assertForbidden();
        $this->getJson("/api/v1/admin/support-tickets/{$ticket->id}")->assertForbidden();

        $this->actingAsAdmin(Admin::factory()->withPermissions(['tickets.view'])->create());
        $this->getJson("/api/v1/admin/support-tickets/{$ticket->id}")->assertOk();
        $this->postJson("/api/v1/admin/support-tickets/{$ticket->id}/messages", ['body' => 'رد'])->assertForbidden();
        $this->postJson("/api/v1/admin/support-tickets/{$ticket->id}/close")->assertForbidden();

        $this->actingAsAdmin(Admin::factory()->withPermissions(['tickets.view', 'tickets.reply'])->create());
        $this->postJson("/api/v1/admin/support-tickets/{$ticket->id}/close")->assertOk();
    }

    public function test_vendors_cannot_use_the_admin_endpoints(): void
    {
        $ticket = SupportTicket::factory()->for($this->store)->create();
        Sanctum::actingAs($this->store->vendor, [Vendor::TOKEN_ABILITY]);

        $this->getJson('/api/v1/admin/support-tickets')->assertForbidden();
        $this->postJson("/api/v1/admin/support-tickets/{$ticket->id}/close")->assertForbidden();
    }

    public function test_notifications_render_in_the_bells(): void
    {
        $ticket = SupportTicket::factory()->for($this->store)->create(['subject' => 'مشكلة الدفع']);
        $vendor = $this->store->vendor;
        $notification = new SupportTicketUpdateNotification(SupportTicketUpdateNotification::REPLIED, $ticket);
        $vendor->notifications()->create(['id' => (string) Str::uuid(), 'type' => $notification->databaseType($vendor), 'data' => $notification->toArray($vendor)]);

        Sanctum::actingAs($vendor, [Vendor::TOKEN_ABILITY]);
        $this->getJson('/api/v1/vendor/notifications')
            ->assertOk()
            ->assertJsonPath('data.0.type', 'ticket_replied')
            ->assertJsonPath('data.0.message', 'رد فريق الدعم على تذكرتك "مشكلة الدفع".')
            ->assertJsonPath('data.0.details.ticket_id', $ticket->id);
    }
}
