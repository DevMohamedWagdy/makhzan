<?php

namespace Tests\Feature\Api\V1\Affiliate;

use App\Models\Affiliate;
use App\Notifications\AffiliateCommissionChangedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class NotificationControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_lists_own_notifications_with_the_unread_count(): void
    {
        $affiliate = Affiliate::factory()->create();
        $affiliate->notify(new AffiliateCommissionChangedNotification);
        $affiliate->notify(new AffiliateCommissionChangedNotification);
        $affiliate->notifications()->first()->markAsRead();
        Affiliate::factory()->create()->notify(new AffiliateCommissionChangedNotification);

        Sanctum::actingAs($affiliate, [Affiliate::TOKEN_ABILITY]);

        $this->getJson('/api/v1/affiliate/notifications')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('summary.unread_count', 1);

        $this->getJson('/api/v1/affiliate/notifications?unread=1')->assertJsonCount(1, 'data');
    }

    public function test_marks_one_or_all_notifications_as_read(): void
    {
        $affiliate = Affiliate::factory()->create();
        $affiliate->notify(new AffiliateCommissionChangedNotification);
        $affiliate->notify(new AffiliateCommissionChangedNotification);
        $notification = $affiliate->notifications()->first();

        Sanctum::actingAs($affiliate, [Affiliate::TOKEN_ABILITY]);

        $this->postJson("/api/v1/affiliate/notifications/{$notification->id}/read")->assertOk();
        $this->assertSame(1, $affiliate->unreadNotifications()->count());

        $this->postJson('/api/v1/affiliate/notifications/read-all')->assertNoContent();
        $this->assertSame(0, $affiliate->unreadNotifications()->count());
    }

    public function test_cannot_read_another_affiliates_notification(): void
    {
        $other = Affiliate::factory()->create();
        $other->notify(new AffiliateCommissionChangedNotification);

        Sanctum::actingAs(Affiliate::factory()->create(), [Affiliate::TOKEN_ABILITY]);

        $this->postJson("/api/v1/affiliate/notifications/{$other->notifications()->sole()->id}/read")->assertNotFound();
    }

    public function test_a_vendor_impersonating_can_read_the_list_but_not_mark_it_read(): void
    {
        $affiliate = Affiliate::factory()->create();
        $affiliate->notify(new AffiliateCommissionChangedNotification);

        Sanctum::actingAs($affiliate, [Affiliate::IMPERSONATION_ABILITY]);

        $this->getJson('/api/v1/affiliate/notifications')->assertOk()->assertJsonCount(1, 'data');
        $this->postJson('/api/v1/affiliate/notifications/read-all')->assertForbidden();
        $this->assertSame(1, $affiliate->unreadNotifications()->count());
    }
}
