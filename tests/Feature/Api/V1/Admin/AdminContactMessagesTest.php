<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Models\Admin;
use App\Models\ContactMessage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * The admin contact inbox: landing-page messages, newest first.
 */
class AdminContactMessagesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Sanctum::actingAs(Admin::factory()->create(), [Admin::TOKEN_ABILITY]);
    }

    public function test_lists_messages_newest_first_with_the_unread_count(): void
    {
        ContactMessage::factory()->read()->create(['full_name' => 'قديمة']);
        ContactMessage::factory()->create(['full_name' => 'جديدة']);

        $this->getJson('/api/v1/admin/contact-messages')
            ->assertOk()
            ->assertJsonPath('data.0.full_name', 'جديدة')
            ->assertJsonPath('data.0.is_read', false)
            ->assertJsonPath('summary.unread', 1)
            ->assertJsonPath('summary.total', 2);
    }

    public function test_filters_by_read_state_and_searches_the_text(): void
    {
        ContactMessage::factory()->read()->create(['message' => 'سؤال عن الشحن']);
        ContactMessage::factory()->create(['message' => 'سؤال عن الأسعار']);

        $this->getJson('/api/v1/admin/contact-messages?status=unread')->assertJsonCount(1, 'data')->assertJsonPath('data.0.message', 'سؤال عن الأسعار');
        $this->getJson('/api/v1/admin/contact-messages?'.http_build_query(['search' => 'الشحن']))->assertJsonCount(1, 'data')->assertJsonPath('data.0.is_read', true);
    }

    public function test_marks_a_message_read_and_unread(): void
    {
        $message = ContactMessage::factory()->create();

        $this->patchJson("/api/v1/admin/contact-messages/{$message->id}", ['is_read' => true])->assertOk()->assertJsonPath('data.is_read', true);
        $this->assertNotNull($message->fresh()->read_at);

        $this->patchJson("/api/v1/admin/contact-messages/{$message->id}", ['is_read' => false])->assertOk()->assertJsonPath('data.is_read', false);
        $this->assertNull($message->fresh()->read_at);
    }

    public function test_deletes_a_message(): void
    {
        $message = ContactMessage::factory()->create();

        $this->deleteJson("/api/v1/admin/contact-messages/{$message->id}")->assertNoContent();

        $this->assertModelMissing($message);
    }

    public function test_viewing_and_deleting_need_their_permissions(): void
    {
        $message = ContactMessage::factory()->create();
        Sanctum::actingAs(Admin::factory()->withPermissions(['messages.view'])->create(), [Admin::TOKEN_ABILITY]);

        $this->getJson('/api/v1/admin/contact-messages')->assertOk();
        $this->deleteJson("/api/v1/admin/contact-messages/{$message->id}")->assertForbidden();

        Sanctum::actingAs(Admin::factory()->withPermissions(['overview.view'])->create(), [Admin::TOKEN_ABILITY]);
        $this->getJson('/api/v1/admin/contact-messages')->assertForbidden();
    }
}
