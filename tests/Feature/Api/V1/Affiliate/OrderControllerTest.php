<?php

namespace Tests\Feature\Api\V1\Affiliate;

use App\Actions\Affiliates\SyncAffiliateStats;
use App\Enums\CommissionStatus;
use App\Enums\OrderStatus;
use App\Models\Affiliate;
use App\Models\AffiliatePayout;
use App\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_lists_the_affiliates_orders_without_customer_details(): void
    {
        $affiliate = Affiliate::factory()->create();
        $delivered = Order::factory()->for($affiliate->store)->create(['affiliate_id' => $affiliate->id, 'status' => OrderStatus::Delivered, 'commission_amount' => 80, 'commission_status' => CommissionStatus::Earned, 'recipient_name' => 'منى أحمد']);
        Order::factory()->for($affiliate->store)->create(['affiliate_id' => $affiliate->id, 'commission_amount' => 45, 'commission_status' => CommissionStatus::Pending]);
        Order::factory()->for($affiliate->store)->create(['affiliate_id' => $affiliate->id, 'commission_amount' => 30, 'commission_status' => CommissionStatus::Pending]);
        Order::factory()->for($affiliate->store)->create();

        $this->withToken($affiliate->issueToken(remember: false))
            ->getJson('/api/v1/affiliate/orders')
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('data.2.order_id', $delivered->id)
            ->assertJsonPath('data.2.commission_status', 'earned')
            ->assertJsonMissingPath('data.2.recipient_name')
            ->assertJsonMissingPath('data.2.phone')
            ->assertJsonPath('summary.expected_commission', 75)
            ->assertJsonPath('summary.expected_orders', 2);

        $this->withToken($affiliate->issueToken(remember: false))
            ->getJson('/api/v1/affiliate/orders?commission_status=earned')
            ->assertJsonPath('data.*.order_id', [$delivered->id]);
    }

    public function test_the_vendor_can_filter_orders_by_affiliate(): void
    {
        $vendor = $this->actingAsVendor();
        $affiliate = Affiliate::factory()->for($vendor)->for($vendor->store)->create();
        $theirs = Order::factory()->for($vendor->store)->create(['affiliate_id' => $affiliate->id]);
        Order::factory()->for($vendor->store)->create();

        $this->getJson("/api/v1/vendor/orders?affiliate_id={$affiliate->id}")->assertOk()->assertJsonPath('data.*.order_id', [$theirs->id]);
    }

    public function test_sync_recomputes_counters_from_delivered_orders_and_payouts(): void
    {
        $affiliate = Affiliate::factory()->create(['orders_count' => 99, 'sales_total' => 99999, 'earned_commission' => 5000, 'pending_balance' => 4000]);
        $code = $affiliate->referralCodes()->first();
        Order::factory()->for($affiliate->store)->create(['affiliate_id' => $affiliate->id, 'referral_code_id' => $code->id, 'subtotal' => 1000, 'commission_amount' => 80, 'commission_status' => CommissionStatus::Earned]);
        Order::factory()->for($affiliate->store)->create(['affiliate_id' => $affiliate->id, 'subtotal' => 500, 'commission_amount' => 40, 'commission_status' => CommissionStatus::Pending]);
        AffiliatePayout::factory()->for($affiliate)->create(['amount' => 30]);
        AffiliatePayout::factory()->for($affiliate)->requested()->create(['amount' => 20]);

        $this->artisan('makhzan:sync-affiliate-stats')->expectsOutputToContain('Updated 1 affiliate(s).')->assertSuccessful();

        $affiliate->refresh();
        $this->assertSame(1, $affiliate->orders_count);
        $this->assertSame(1000.0, $affiliate->sales_total);
        $this->assertSame(80.0, $affiliate->earned_commission);
        $this->assertSame(50.0, $affiliate->pending_balance);
        $this->assertSame(1, $code->fresh()->orders);

        $this->assertSame(['before' => ['orders_count' => 1, 'sales_total' => 1000.0, 'earned_commission' => 80.0, 'pending_balance' => 50.0], 'after' => ['orders_count' => 1, 'sales_total' => 1000.0, 'earned_commission' => 80.0, 'pending_balance' => 50.0]], app(SyncAffiliateStats::class)->handle($affiliate, dryRun: true));
    }

    public function test_dry_run_changes_nothing(): void
    {
        $affiliate = Affiliate::factory()->create(['orders_count' => 7]);

        $this->artisan('makhzan:sync-affiliate-stats', ['--dry-run' => true])->expectsOutputToContain('Would update 1 affiliate(s).')->assertSuccessful();

        $this->assertSame(7, $affiliate->fresh()->orders_count);
    }
}
