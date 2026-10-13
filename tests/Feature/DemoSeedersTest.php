<?php

namespace Tests\Feature;

use App\Actions\Affiliates\SyncAffiliateStats;
use App\Enums\CommissionStatus;
use App\Models\Affiliate;
use App\Models\Order;
use Database\Seeders\DemoVendorSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DemoSeedersTest extends TestCase
{
    use RefreshDatabase;

    public function test_demo_data_has_real_orders_and_consistent_affiliate_numbers(): void
    {
        $this->seed();

        $this->assertGreaterThan(20, Order::count());

        $demoAffiliate = Affiliate::query()->firstWhere('phone', DemoVendorSeeder::AFFILIATE_PHONE);
        $this->assertGreaterThan(0, $demoAffiliate->orders()->where('commission_status', CommissionStatus::Earned)->count());
        $this->assertGreaterThan(0, $demoAffiliate->earned_commission);
        $this->assertGreaterThanOrEqual(0, $demoAffiliate->pending_balance);
        $this->assertSame(2, $demoAffiliate->payouts()->count());

        // Every affiliate's counters already match what the orders say.
        Affiliate::all()->each(function (Affiliate $affiliate): void {
            ['before' => $before, 'after' => $after] = app(SyncAffiliateStats::class)->handle($affiliate, dryRun: true);

            $this->assertEquals($after, $before, "Affiliate #{$affiliate->id} counters are out of sync");
        });
    }
}
