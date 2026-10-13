<?php

namespace Tests\Feature\Api\V1\Vendor;

use App\Enums\CommissionStatus;
use App\Enums\OrderStatus;
use App\Models\Affiliate;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Vendor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportControllerTest extends TestCase
{
    use RefreshDatabase;

    private Vendor $vendor;

    protected function setUp(): void
    {
        parent::setUp();

        $this->travelTo('2026-10-13 12:00:00');
        $this->vendor = $this->actingAsVendor();
    }

    private function order(string $date, OrderStatus $status, float $subtotal, array $attributes = []): Order
    {
        return Order::factory()->for($this->vendor->store)->status($status)->create([
            'subtotal' => $subtotal,
            'shipping_fee' => 50,
            'total' => $subtotal + 50,
            'created_at' => $date,
            ...$attributes,
        ]);
    }

    public function test_reports_totals_daily_series_and_rankings_for_the_period(): void
    {
        $affiliate = Affiliate::factory()->for($this->vendor)->for($this->vendor->store)->create(['full_name' => 'سارة']);
        $delivered = $this->order('2026-10-10 09:00:00', OrderStatus::Delivered, 500, ['affiliate_id' => $affiliate->id, 'commission_amount' => 50, 'commission_status' => CommissionStatus::Earned, 'governorate_id' => 'giza']);
        $pending = $this->order('2026-10-12 18:00:00', OrderStatus::Pending, 200);
        $cancelled = $this->order('2026-10-12 19:00:00', OrderStatus::Cancelled, 900);
        $this->order('2026-09-01 10:00:00', OrderStatus::Delivered, 1000);
        Order::factory()->create(['created_at' => '2026-10-11 10:00:00']);

        OrderItem::factory()->for($delivered)->create(['product_name' => 'تيشيرت', 'quantity' => 3, 'line_total' => 300]);
        OrderItem::factory()->for($pending)->create(['product_name' => 'تيشيرت', 'quantity' => 1, 'line_total' => 100]);
        OrderItem::factory()->for($cancelled)->create(['product_name' => 'جاكيت', 'quantity' => 9, 'line_total' => 900]);

        $response = $this->getJson('/api/v1/vendor/reports?from=2026-10-10&to=2026-10-13')
            ->assertOk()
            ->assertJsonPath('period', ['from' => '2026-10-10', 'to' => '2026-10-13', 'days' => 4])
            ->assertJsonPath('totals.orders', 2)
            ->assertJsonPath('totals.sales', 800)
            ->assertJsonPath('totals.average_order', 400)
            ->assertJsonPath('totals.revenue', 550)
            ->assertJsonPath('totals.delivered_orders', 1)
            ->assertJsonPath('totals.commissions', 50)
            ->assertJsonPath('totals.net_revenue', 500)
            ->assertJsonPath('totals.cancelled', 1)
            ->assertJsonPath('statuses.pending', 1)
            ->assertJsonPath('statuses.cancelled', 1)
            ->assertJsonCount(4, 'daily')
            ->assertJsonPath('daily.0', ['date' => '2026-10-10', 'orders' => 1, 'sales' => 550, 'revenue' => 550])
            ->assertJsonPath('daily.1.orders', 0)
            ->assertJsonPath('daily.2', ['date' => '2026-10-12', 'orders' => 1, 'sales' => 250, 'revenue' => 0])
            ->assertJsonCount(1, 'top_products')
            ->assertJsonPath('top_products.0.quantity', 4)
            ->assertJsonPath('top_products.0.sales', 400)
            ->assertJsonPath('affiliates.0', ['affiliate_id' => $affiliate->id, 'full_name' => 'سارة', 'orders' => 1, 'sales' => 500, 'commission' => 50])
            ->assertJsonPath('governorates.0.sales', 550);

        $this->assertSame(['giza', 'cairo'], array_column($response->json('governorates'), 'governorate_id'));
    }

    public function test_compares_with_the_previous_period_of_the_same_length(): void
    {
        $this->order('2026-10-08 10:00:00', OrderStatus::Delivered, 100, ['customer_id' => null]);
        $this->order('2026-10-12 10:00:00', OrderStatus::Delivered, 300, ['customer_id' => null]);
        Customer::factory()->create(['store_id' => $this->vendor->store->id, 'created_at' => '2026-10-12 10:00:00']);

        $this->getJson('/api/v1/vendor/reports?from=2026-10-10&to=2026-10-13')
            ->assertJsonPath('previous.orders', 1)
            ->assertJsonPath('previous.revenue', 150)
            ->assertJsonPath('totals.revenue', 350)
            ->assertJsonPath('totals.new_customers', 1);
    }

    public function test_defaults_to_the_last_30_days(): void
    {
        $this->getJson('/api/v1/vendor/reports')
            ->assertOk()
            ->assertJsonPath('period', ['from' => '2026-09-14', 'to' => '2026-10-13', 'days' => 30])
            ->assertJsonCount(30, 'daily');
    }

    public function test_validates_the_period(): void
    {
        $this->getJson('/api/v1/vendor/reports?from=2026-10-10&to=2026-10-01')->assertJsonValidationErrors('to');
        $this->getJson('/api/v1/vendor/reports?from=2024-01-01&to=2026-10-01')->assertJsonValidationErrors('from');
    }
}
