<?php

namespace Tests\Feature\Api\V1\Vendor;

use App\Enums\OrderStatus;
use App\Enums\ProductStatus;
use App\Enums\PurchaseOrderStatus;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\Supplier;
use App\Models\Vendor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InventoryInsightsTest extends TestCase
{
    use RefreshDatabase;

    private Vendor $vendor;

    protected function setUp(): void
    {
        parent::setUp();

        $this->vendor = $this->actingAsVendor();
        $this->vendor->store->update(['low_stock_threshold' => 5]);
    }

    private function variant(string $name, array $attributes = [], array $productAttributes = []): ProductVariant
    {
        $variant = Product::factory()->for($this->vendor->store)->create(['name' => $name, ...$productAttributes])->variants()->sole();
        $variant->forceFill(['price' => 200, 'stock' => 0, 'cost' => 100, 'low_stock_threshold' => null, ...$attributes])->save();

        return $variant;
    }

    private function sell(ProductVariant $variant, int $quantity, int $daysAgo = 3, OrderStatus $status = OrderStatus::Delivered): void
    {
        $order = Order::factory()->create(['store_id' => $this->vendor->store->id, 'status' => $status, 'created_at' => now()->subDays($daysAgo)]);
        OrderItem::factory()->for($order)->create(['product_id' => $variant->product_id, 'product_variant_id' => $variant->id, 'quantity' => $quantity]);
    }

    private function purchase(ProductVariant $variant, Supplier $supplier, PurchaseOrderStatus $status, int $ordered, int $received, float $unitCost): void
    {
        $order = PurchaseOrder::factory()->for($supplier)->create(['status' => $status]);
        PurchaseOrderItem::factory()->for($order)->create(['product_id' => $variant->product_id, 'product_variant_id' => $variant->id, 'quantity_ordered' => $ordered, 'quantity_received' => $received, 'unit_cost' => $unitCost]);
    }

    public function test_values_stock_at_cost_and_selling_price(): void
    {
        $this->variant('فستان', ['stock' => 10, 'cost' => 100, 'price' => 250]);
        $this->variant('قميص', ['stock' => 4, 'cost' => null, 'price' => 150]);

        $this->getJson('/api/v1/vendor/inventory/reports/value')
            ->assertOk()
            ->assertJsonPath('data.totals', ['units' => 14, 'cost_value' => 1000, 'retail_value' => 3100, 'missing_cost' => 1]);
    }

    public function test_dead_stock_lists_in_stock_variants_without_recent_sales(): void
    {
        $sleeping = $this->variant('معطف', ['stock' => 6, 'created_at' => now()->subDays(200)]);
        $soldLongAgo = $this->variant('شال', ['stock' => 2, 'created_at' => now()->subDays(200)]);
        $selling = $this->variant('قميص', ['stock' => 8, 'created_at' => now()->subDays(200)]);
        $this->variant('جديد', ['stock' => 5]);
        $this->variant('نفد', ['stock' => 0, 'created_at' => now()->subDays(200)]);

        $this->sell($soldLongAgo, 1, 90);
        $this->sell($selling, 1, 10);
        $this->sell($selling, 3, 2, OrderStatus::Cancelled);

        $this->getJson('/api/v1/vendor/inventory/reports/dead-stock?days=60')
            ->assertOk()
            ->assertJsonPath('data.items.*.variant_id', [$sleeping->id, $soldLongAgo->id])
            ->assertJsonPath('data.items.0.last_sold_at', null)
            ->assertJsonPath('data.totals', ['variants' => 2, 'units' => 8, 'cost_value' => 800]);

        $this->getJson('/api/v1/vendor/inventory/reports/dead-stock?days=180')->assertJsonPath('data.items.*.variant_id', [$sleeping->id]);
        $this->getJson('/api/v1/vendor/inventory/reports/dead-stock?days=45')->assertJsonValidationErrors('days');
    }

    public function test_suggests_what_to_reorder_from_the_sales_pace_and_the_last_supplier(): void
    {
        $supplier = Supplier::factory()->for($this->vendor->store)->create(['name' => 'مصنع النور']);

        // Sells a unit a day and has 2 left: 30 days of cover needs 28 more, at the last order's cost.
        $fast = $this->variant('فستان', ['stock' => 2]);
        $this->sell($fast, 30);
        $this->purchase($fast, $supplier, PurchaseOrderStatus::Received, 20, 20, 120);

        // Under the threshold without sales: topped up to just above it.
        $low = $this->variant('شال', ['stock' => 1, 'cost' => 60]);

        // Low, but enough is already on order.
        $coming = $this->variant('حزام', ['stock' => 1]);
        $this->purchase($coming, $supplier, PurchaseOrderStatus::Ordered, 10, 0, 50);

        $plenty = $this->variant('قميص', ['stock' => 100]);
        $this->sell($plenty, 3);
        $this->variant('مؤرشف', ['stock' => 0], ['status' => ProductStatus::Archived]);

        $this->getJson('/api/v1/vendor/reorder-suggestions?days=30&cover_days=30')
            ->assertOk()
            ->assertJsonPath('data.items.*.variant_id', [$fast->id, $low->id])
            ->assertJsonPath('data.items.0.suggested_quantity', 28)
            ->assertJsonPath('data.items.0.days_left', 2)
            ->assertJsonPath('data.items.0.unit_cost', 120)
            ->assertJsonPath('data.items.0.supplier_name', 'مصنع النور')
            ->assertJsonPath('data.items.1.suggested_quantity', 5)
            ->assertJsonPath('data.items.1.supplier_id', null)
            ->assertJsonPath('data.items.1.unit_cost', 60)
            ->assertJsonPath('data.totals', ['variants' => 2, 'units' => 33, 'cost' => 3660])
            ->assertJsonPath('data.suppliers', [['supplier_id' => $supplier->id, 'name' => 'مصنع النور']]);

        $this->getJson('/api/v1/vendor/reorder-suggestions?cover_days=3')->assertJsonValidationErrors('cover_days');
    }
}
