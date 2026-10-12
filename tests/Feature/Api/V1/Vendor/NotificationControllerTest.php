<?php

namespace Tests\Feature\Api\V1\Vendor;

use App\Models\Affiliate;
use App\Models\Vendor;
use App\Notifications\AffiliateRegisteredNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationControllerTest extends TestCase
{
    use RefreshDatabase;

    private function notifyAboutNewAffiliate(Vendor $vendor, string $name = 'سارة محمود'): Affiliate
    {
        $affiliate = Affiliate::factory()->for($vendor)->for($vendor->store)->pending()->create(['full_name' => $name]);
        $vendor->notify(new AffiliateRegisteredNotification($affiliate));

        return $affiliate;
    }

    public function test_lists_own_notifications_newest_first_with_the_unread_count(): void
    {
        $vendor = $this->actingAsVendor();
        $this->notifyAboutNewAffiliate($vendor, 'الأول');
        $this->travel(1)->minutes();
        $newest = $this->notifyAboutNewAffiliate($vendor, 'الثاني');
        $vendor->notifications()->reorder()->oldest()->first()->markAsRead();
        $this->notifyAboutNewAffiliate(Vendor::factory()->withStore()->create());

        $this->getJson('/api/v1/vendor/notifications')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.type', 'affiliate_registered')
            ->assertJsonPath('data.0.message', 'الثاني أرسل طلب انضمام لفريق المسوقين وينتظر موافقتك')
            ->assertJsonPath('data.0.details.affiliate_id', $newest->id)
            ->assertJsonPath('data.0.read_at', null)
            ->assertJsonPath('summary.unread_count', 1);
    }

    public function test_filters_unread_notifications(): void
    {
        $vendor = $this->actingAsVendor();
        $this->notifyAboutNewAffiliate($vendor);
        $this->notifyAboutNewAffiliate($vendor);
        $vendor->notifications()->first()->markAsRead();

        $this->getJson('/api/v1/vendor/notifications?unread=1')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_marks_one_notification_as_read(): void
    {
        $vendor = $this->actingAsVendor();
        $this->notifyAboutNewAffiliate($vendor);
        $notification = $vendor->notifications()->sole();

        $this->postJson("/api/v1/vendor/notifications/{$notification->id}/read")->assertOk()->assertJsonPath('data.id', $notification->id);

        $this->assertNotNull($notification->fresh()->read_at);
    }

    public function test_cannot_read_another_vendors_notification(): void
    {
        $this->actingAsVendor();
        $other = Vendor::factory()->withStore()->create();
        $this->notifyAboutNewAffiliate($other);
        $notification = $other->notifications()->sole();

        $this->postJson("/api/v1/vendor/notifications/{$notification->id}/read")->assertNotFound();
        $this->assertNull($notification->fresh()->read_at);
    }

    public function test_marks_all_notifications_as_read(): void
    {
        $vendor = $this->actingAsVendor();
        $this->notifyAboutNewAffiliate($vendor);
        $this->notifyAboutNewAffiliate($vendor);

        $this->postJson('/api/v1/vendor/notifications/read-all')->assertNoContent();

        $this->assertSame(0, $vendor->unreadNotifications()->count());
    }

    public function test_an_affiliates_transfer_request_reaches_the_vendors_bell(): void
    {
        $vendor = Vendor::factory()->withStore()->create();
        $affiliate = Affiliate::factory()->for($vendor)->for($vendor->store)->create(['pending_balance' => 500, 'full_name' => 'سارة محمود']);

        $this->withToken($affiliate->issueToken(remember: false))->postJson('/api/v1/affiliate/payouts', ['amount' => 400])->assertCreated();

        $notification = $vendor->notifications()->sole();
        $this->assertSame('payout_requested', $notification->type);
        $this->assertSame('طلب سارة محمود تحويل 400.00 ج.م من رصيد عمولاته', $notification->data['message']);
        $this->assertSame($affiliate->id, $notification->data['affiliate_id']);
    }
}
