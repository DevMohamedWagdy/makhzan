<?php

namespace Tests\Feature\Api\V1\Vendor;

use App\Enums\CommissionStatus;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Affiliate;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
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

    public function test_breaks_sales_down_by_payment_method_and_skips_unpaid_checkouts(): void
    {
        $this->order('2026-10-12 10:00:00', OrderStatus::Delivered, 400);
        $this->order('2026-10-12 11:00:00', OrderStatus::Confirmed, 950, ['payment_method' => PaymentMethod::Card, 'payment_status' => PaymentStatus::PartiallyRefunded, 'refunded_amount' => 200]);
        $this->order('2026-10-12 12:00:00', OrderStatus::Pending, 5000, ['payment_method' => PaymentMethod::Wallet, 'payment_status' => PaymentStatus::Pending]);
        $this->order('2026-10-12 13:00:00', OrderStatus::Cancelled, 5000, ['payment_method' => PaymentMethod::Card, 'payment_status' => PaymentStatus::Failed]);

        $this->getJson('/api/v1/vendor/reports?from=2026-10-12&to=2026-10-12')
            ->assertOk()
            ->assertJsonPath('totals.orders', 2)
            ->assertJsonPath('totals.sales', 1450)
            ->assertJsonPath('totals.cancelled', 0)
            ->assertJsonPath('totals.refunds', 200)
            ->assertJsonPath('payment_methods', [
                ['method' => 'cod', 'orders' => 1, 'sales' => 450],
                ['method' => 'card', 'orders' => 1, 'sales' => 1000],
                ['method' => 'wallet', 'orders' => 0, 'sales' => 0],
            ]);
    }

    public function test_ranks_products_by_the_profit_of_their_delivered_sales(): void
    {
        $delivered = $this->order('2026-10-12 10:00:00', OrderStatus::Delivered, 1000);
        $pending = $this->order('2026-10-12 11:00:00', OrderStatus::Pending, 5000);

        [$tshirt, $jacket, $bag, $watch] = Product::factory()->for($this->vendor->store)->count(4)->create();

        OrderItem::factory()->for($delivered)->create(['product_id' => $tshirt->id, 'product_name' => 'تيشيرت', 'quantity' => 4, 'line_total' => 400, 'unit_cost' => 50]);
        OrderItem::factory()->for($delivered)->create(['product_id' => $jacket->id, 'product_name' => 'جاكيت', 'quantity' => 1, 'line_total' => 600, 'unit_cost' => 500]);
        OrderItem::factory()->for($delivered)->create(['product_id' => $bag->id, 'product_name' => 'شنطة', 'quantity' => 1, 'line_total' => 900, 'unit_cost' => null]);
        OrderItem::factory()->for($pending)->create(['product_id' => $watch->id, 'product_name' => 'ساعة', 'quantity' => 1, 'line_total' => 5000, 'unit_cost' => 10]);

        $this->getJson('/api/v1/vendor/reports?from=2026-10-12&to=2026-10-12')
            ->assertOk()
            ->assertJsonCount(2, 'profitable_products')
            ->assertJsonPath('profitable_products.0', ['product_id' => $tshirt->id, 'name' => 'تيشيرت', 'quantity' => 4, 'sales' => 400, 'cost' => 200, 'profit' => 200, 'margin' => 50])
            ->assertJsonPath('profitable_products.1.name', 'جاكيت')
            ->assertJsonPath('profitable_products.1.profit', 100);
    }

    public function test_reports_the_return_rate_of_each_governorate(): void
    {
        $this->order('2026-10-12 10:00:00', OrderStatus::Delivered, 100, ['governorate_id' => 'giza']);
        $this->order('2026-10-12 10:00:00', OrderStatus::Delivered, 100, ['governorate_id' => 'giza']);
        $this->order('2026-10-12 10:00:00', OrderStatus::Delivered, 100, ['governorate_id' => 'giza']);
        $this->order('2026-10-12 10:00:00', OrderStatus::Returned, 100, ['governorate_id' => 'giza']);
        $this->order('2026-10-12 10:00:00', OrderStatus::Cancelled, 100, ['governorate_id' => 'giza']);
        $this->order('2026-10-12 10:00:00', OrderStatus::Shipped, 100, ['governorate_id' => 'aswan']);

        $this->getJson('/api/v1/vendor/reports?from=2026-10-12&to=2026-10-12')
            ->assertOk()
            ->assertJsonPath('governorate_returns.0', ['governorate_id' => 'giza', 'orders' => 5, 'delivered' => 3, 'returned' => 1, 'cancelled' => 1, 'return_rate' => 25])
            ->assertJsonPath('governorate_returns.1', ['governorate_id' => 'aswan', 'orders' => 1, 'delivered' => 0, 'returned' => 0, 'cancelled' => 0, 'return_rate' => null]);
    }

    public function test_forecasts_which_variants_will_sell_out_at_their_recent_pace(): void
    {
        $product = Product::factory()->for($this->vendor->store)->create(['name' => 'تيشيرت']);
        $fastSeller = ProductVariant::factory()->for($product)->create(['option_values' => ['أحمر', 'L'], 'stock' => 10]);
        $slowSeller = ProductVariant::factory()->for($product)->create(['stock' => 100]);
        $soldOut = ProductVariant::factory()->for($product)->create(['stock' => 0]);
        $cancelledOnly = ProductVariant::factory()->for($product)->create(['stock' => 1]);

        $recent = $this->order('2026-10-01 10:00:00', OrderStatus::Delivered, 100);
        $old = $this->order('2026-08-01 10:00:00', OrderStatus::Delivered, 100);
        $cancelled = $this->order('2026-10-01 10:00:00', OrderStatus::Cancelled, 100);

        OrderItem::factory()->for($recent)->create(['product_variant_id' => $fastSeller->id, 'quantity' => 30]);
        OrderItem::factory()->for($recent)->create(['product_variant_id' => $slowSeller->id, 'quantity' => 3]);
        OrderItem::factory()->for($recent)->create(['product_variant_id' => $soldOut->id, 'quantity' => 6]);
        OrderItem::factory()->for($old)->create(['product_variant_id' => $slowSeller->id, 'quantity' => 500]);
        OrderItem::factory()->for($cancelled)->create(['product_variant_id' => $cancelledOnly->id, 'quantity' => 50]);

        $this->getJson('/api/v1/vendor/reports?from=2026-01-01&to=2026-01-31')
            ->assertOk()
            ->assertJsonCount(2, 'stock_forecast')
            ->assertJsonPath('stock_forecast.0.variant_id', $soldOut->id)
            ->assertJsonPath('stock_forecast.0.days_left', 0)
            ->assertJsonPath('stock_forecast.1', [
                'variant_id' => $fastSeller->id,
                'product_id' => $product->id,
                'name' => 'تيشيرت',
                'variant_title' => 'أحمر / L',
                'stock' => 10,
                'sold' => 30,
                'daily_rate' => 1,
                'days_left' => 10,
            ]);
    }

    public function test_reports_include_only_the_vendors_own_stock_forecast(): void
    {
        $otherVariant = ProductVariant::factory()->create(['stock' => 1]);
        $order = $this->order('2026-10-12 10:00:00', OrderStatus::Delivered, 100);
        OrderItem::factory()->for($order)->create(['product_variant_id' => $otherVariant->id, 'quantity' => 30]);

        $this->getJson('/api/v1/vendor/reports')->assertOk()->assertJsonCount(0, 'stock_forecast');
    }

    public function test_gross_profit_takes_off_coupon_and_points_discounts(): void
    {
        $order = $this->order('2026-10-12 10:00:00', OrderStatus::Delivered, 1000, ['discount' => 100, 'points_discount' => 50, 'total' => 900]);
        OrderItem::factory()->for($order)->create(['quantity' => 2, 'line_total' => 1000, 'unit_cost' => 300]);

        $this->getJson('/api/v1/vendor/reports?from=2026-10-12&to=2026-10-12')
            ->assertOk()
            ->assertJsonPath('totals.discounts', 150)
            ->assertJsonPath('totals.cost_of_goods', 600)
            ->assertJsonPath('totals.gross_profit', 250)
            ->assertJsonPath('totals.profit_margin', 29.4);
    }
}
