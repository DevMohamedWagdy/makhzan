<?php

namespace Tests\Feature\Api\V1\Vendor;

use App\Actions\Orders\UpdateOrderStatus;
use App\Enums\CommissionStatus;
use App\Enums\OrderStatus;
use App\Models\Affiliate;
use App\Models\AffiliatePayout;
use App\Models\Order;
use App\Models\Vendor;
use App\Notifications\AffiliateAccountStatusNotification;
use App\Notifications\AffiliatePayoutProcessedNotification;
use Database\Factories\AffiliateFactory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Every vendor action that changes an affiliate's account, payouts or commission leaves
 * them a notification in the portal (and an email for account and payout changes).
 */
class AffiliateNotificationsTest extends TestCase
{
    use RefreshDatabase;

    private Vendor $vendor;

    protected function setUp(): void
    {
        parent::setUp();

        $this->vendor = $this->actingAsVendor();
    }

    private function affiliate(): AffiliateFactory
    {
        return Affiliate::factory()->for($this->vendor)->for($this->vendor->store);
    }

    /**
     * @return list<string>
     */
    private function notificationTypes(Affiliate $affiliate): array
    {
        return $affiliate->notifications()->pluck('type')->all();
    }

    public function test_approving_freezing_and_reactivating_notify_the_affiliate_by_email_and_in_the_portal(): void
    {
        $affiliate = $this->affiliate()->pending()->create(['email' => 'sara@example.com']);

        $this->patchJson("/api/v1/vendor/affiliates/{$affiliate->id}/status", ['status' => 'active'])->assertOk();
        $this->travel(1)->minutes();
        $this->patchJson("/api/v1/vendor/affiliates/{$affiliate->id}/status", ['status' => 'frozen', 'reason' => 'مخالفة سياسة الإعلانات'])->assertOk();
        $this->travel(1)->minutes();
        $this->patchJson("/api/v1/vendor/affiliates/{$affiliate->id}/status", ['status' => 'active'])->assertOk();

        $this->assertSame(['account_reactivated', 'account_frozen', 'account_approved'], $this->notificationTypes($affiliate));
        $this->assertSame('مخالفة سياسة الإعلانات', $affiliate->notifications()->where('type', 'account_frozen')->sole()->data['reason']);
    }

    public function test_account_changes_are_emailed_when_the_affiliate_has_an_email(): void
    {
        Notification::fake();
        $affiliate = $this->affiliate()->frozen()->create(['email' => 'sara@example.com']);

        $this->patchJson("/api/v1/vendor/affiliates/{$affiliate->id}/status", ['status' => 'active'])->assertOk();

        Notification::assertSentTo($affiliate, AffiliateAccountStatusNotification::class, function (AffiliateAccountStatusNotification $notification, array $channels): bool {
            return $notification->event === AffiliateAccountStatusNotification::REACTIVATED && $channels === ['mail', 'database'];
        });
    }

    public function test_setting_the_same_status_again_sends_nothing(): void
    {
        Notification::fake();
        $affiliate = $this->affiliate()->create();

        $this->patchJson("/api/v1/vendor/affiliates/{$affiliate->id}/status", ['status' => 'active'])->assertOk();

        Notification::assertNothingSent();
    }

    public function test_rejecting_an_applicant_emails_them_after_the_account_is_deleted(): void
    {
        Notification::fake();
        $affiliate = $this->affiliate()->pending()->create(['email' => 'applicant@example.com']);

        $this->deleteJson("/api/v1/vendor/affiliates/{$affiliate->id}")->assertNoContent();

        Notification::assertSentOnDemand(AffiliateAccountStatusNotification::class, function (AffiliateAccountStatusNotification $notification, array $channels, AnonymousNotifiable $notifiable): bool {
            return $notification->event === AffiliateAccountStatusNotification::REJECTED
                && $channels === ['mail']
                && $notifiable->routes['mail'] === 'applicant@example.com';
        });
    }

    public function test_recording_and_rejecting_payouts_notify_the_affiliate(): void
    {
        $affiliate = $this->affiliate()->create(['pending_balance' => 900, 'email' => null]);
        $request = AffiliatePayout::factory()->for($affiliate)->requested()->create(['store_id' => $this->vendor->store->id, 'amount' => 300]);

        $this->postJson("/api/v1/vendor/affiliates/{$affiliate->id}/payouts/{$request->id}/reject", ['note' => 'الرصيد قيد المراجعة'])->assertOk();
        $this->travel(1)->minutes();
        $this->postJson("/api/v1/vendor/affiliates/{$affiliate->id}/payouts", ['amount' => 500, 'reference' => 'TX-1'])->assertCreated();

        $this->assertSame(['payout_paid', 'payout_rejected'], $this->notificationTypes($affiliate));

        Sanctum::actingAs($affiliate, [Affiliate::TOKEN_ABILITY]);

        $this->getJson('/api/v1/affiliate/notifications')
            ->assertJsonPath('data.0.message', 'حوّل المتجر 500.00 ج.م من عمولاتك إلى وسيلة السحب المسجلة.')
            ->assertJsonPath('data.1.message', 'رفض المتجر طلب تحويل 300.00 ج.م، ورصيدك المستحق كما هو.')
            ->assertJsonPath('data.1.details.note', 'الرصيد قيد المراجعة');
    }

    public function test_payout_emails_are_only_sent_to_affiliates_with_an_email(): void
    {
        Notification::fake();
        $affiliate = $this->affiliate()->create(['pending_balance' => 900, 'email' => null]);

        $this->postJson("/api/v1/vendor/affiliates/{$affiliate->id}/payouts", ['amount' => 500])->assertCreated();

        Notification::assertSentTo($affiliate, AffiliatePayoutProcessedNotification::class, fn ($notification, array $channels): bool => $channels === ['database']);
    }

    public function test_order_status_changes_notify_the_affiliate_about_their_commission(): void
    {
        $affiliate = $this->affiliate()->create();
        $order = fn (array $attributes = []) => Order::factory()->for($this->vendor->store)->create([
            'affiliate_id' => $affiliate->id,
            'commission_amount' => 40,
            'commission_status' => CommissionStatus::Pending,
            'status' => OrderStatus::Shipped,
            ...$attributes,
        ]);
        $delivered = $order(['number' => 1001]);
        $refused = $order(['number' => 1002]);
        $unattributed = Order::factory()->for($this->vendor->store)->status(OrderStatus::Shipped)->create();
        $updateStatus = app(UpdateOrderStatus::class);

        $updateStatus->handle($delivered, OrderStatus::Delivered, 'vendor');
        $this->travel(1)->minutes();
        $updateStatus->handle($delivered, OrderStatus::Returned, 'vendor');
        $this->travel(1)->minutes();
        $updateStatus->handle($refused, OrderStatus::Returned, 'vendor');
        $updateStatus->handle($unattributed, OrderStatus::Delivered, 'vendor');

        $this->assertSame(['commission_cancelled', 'commission_reversed', 'commission_earned'], $this->notificationTypes($affiliate));

        Sanctum::actingAs($affiliate, [Affiliate::TOKEN_ABILITY]);

        $this->getJson('/api/v1/affiliate/notifications')
            ->assertJsonPath('data.2.message', 'تم توصيل الطلب #1001 وأُضيفت 40.00 ج.م لرصيدك')
            ->assertJsonPath('data.2.details.order_id', $delivered->id);
    }

    public function test_changing_the_commission_notifies_the_affiliate(): void
    {
        $affiliate = $this->affiliate()->create();

        $this->putJson("/api/v1/vendor/affiliates/{$affiliate->id}/commission", ['use_tier_default' => false, 'type' => 'percentage', 'value' => 12.5])->assertOk();

        Sanctum::actingAs($affiliate, [Affiliate::TOKEN_ABILITY]);

        $this->getJson('/api/v1/affiliate/notifications')
            ->assertJsonPath('data.0.type', 'commission_changed')
            ->assertJsonPath('data.0.message', 'تم تحديث عمولتك إلى 12.5% من قيمة كل طلب جديد');
    }
}
