<?php

namespace Tests\Feature\Api\V1\Vendor;

use App\Actions\Orders\PlaceOrder;
use App\Actions\Orders\UpdateOrderStatus;
use App\Enums\OrderStatus;
use App\Enums\StockMovementType;
use App\Models\Customer;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\ProductVariant;
use App\Models\Vendor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InventoryTest extends TestCase
{
    use RefreshDatabase;

    private Vendor $vendor;

    protected function setUp(): void
    {
        parent::setUp();

        $this->vendor = $this->actingAsVendor();
        $this->vendor->store->forceFill(['default_shipping_price' => 50])->save();
    }

    private function variant(array $attributes = [], string $name = 'فستان'): ProductVariant
    {
        $variant = Product::factory()->for($this->vendor->store)->create(['name' => $name])->variants()->sole();
        $variant->update(['price' => 400, 'stock' => 10, ...$attributes]);

        return $variant;
    }

    private function placeOrder(ProductVariant $variant, int $quantity)
    {
        $customer = Customer::factory()->for($this->vendor->store)->create();

        return app(PlaceOrder::class)->handle($this->vendor->store, $customer, [['variant_id' => $variant->id, 'quantity' => $quantity]], [
            'recipient_name' => 'منى', 'phone' => '01012345678', 'governorate_id' => 'cairo', 'city_id' => 'maadi', 'address_line' => '5 شارع 9',
        ]);
    }

    /**
     * @return list<array{0: string, 1: int, 2: int}>
     */
    private function movements(ProductVariant $variant): array
    {
        return $variant->stockMovements()->oldest('id')->get()->map(fn ($movement): array => [$movement->type->value, $movement->quantity, $movement->stock_after])->all();
    }

    public function test_the_product_form_logs_opening_stock_and_quantity_edits(): void
    {
        $category = ProductCategory::factory()->for($this->vendor->store)->create();
        $payload = ['category_id' => $category->id, 'name' => 'قميص', 'status' => 'active', 'options' => [], 'variants' => [['price' => 300, 'cost' => 180, 'stock' => 12]]];

        $productId = $this->postJson('/api/v1/vendor/products', $payload)->assertCreated()->json('data.product_id');
        $variant = Product::find($productId)->variants()->sole();

        $payload['variants'][0] = ['id' => $variant->id, 'price' => 300, 'stock' => 9];
        $this->putJson("/api/v1/vendor/products/{$productId}", $payload)->assertOk();
        $this->putJson("/api/v1/vendor/products/{$productId}", $payload)->assertOk();

        $this->assertSame([['initial', 12, 12], ['product_edit', -3, 9]], $this->movements($variant));
        $this->assertSame(180.0, $variant->fresh()->cost, 'Omitting the cost keeps it.');
    }

    public function test_orders_log_sales_and_restocks_and_snapshot_the_cost(): void
    {
        $variant = $this->variant(['cost' => 250]);

        $order = $this->placeOrder($variant, 3);
        app(UpdateOrderStatus::class)->handle($order, OrderStatus::Cancelled, 'vendor');

        $this->assertSame([['sale', -3, 7], ['cancellation', 3, 10]], $this->movements($variant));
        $this->assertSame($order->id, $variant->stockMovements()->first()->order_id);
        $this->assertSame(250.0, $order->items()->sole()->unit_cost);
    }

    public function test_records_restocks_with_weighted_average_cost_counts_and_write_offs(): void
    {
        $variant = $this->variant(['cost' => 100, 'stock' => 10]);

        $this->postJson("/api/v1/vendor/inventory/{$variant->id}/movements", ['type' => 'restock', 'quantity' => 30, 'unit_cost' => 140, 'note' => 'فاتورة 55'])
            ->assertCreated()
            ->assertJsonPath('movement.type', 'restock')
            ->assertJsonPath('item.stock', 40)
            ->assertJsonPath('item.cost', 130);

        $this->postJson("/api/v1/vendor/inventory/{$variant->id}/movements", ['type' => 'adjustment', 'quantity' => 37])->assertCreated()->assertJsonPath('item.stock', 37);
        $this->postJson("/api/v1/vendor/inventory/{$variant->id}/movements", ['type' => 'damage', 'quantity' => 2])->assertCreated()->assertJsonPath('item.stock', 35);
        $this->postJson("/api/v1/vendor/inventory/{$variant->id}/movements", ['type' => 'adjustment', 'quantity' => 35])->assertOk()->assertJsonPath('movement', null);

        $this->assertSame([['restock', 30, 40], ['adjustment', -3, 37], ['damage', -2, 35]], $this->movements($variant));
    }

    public function test_rejects_invalid_movements(): void
    {
        $variant = $this->variant(['stock' => 3]);

        $this->postJson("/api/v1/vendor/inventory/{$variant->id}/movements", ['type' => 'damage', 'quantity' => 5])->assertJsonValidationErrors('quantity');
        $this->postJson("/api/v1/vendor/inventory/{$variant->id}/movements", ['type' => 'sale', 'quantity' => 1])->assertJsonValidationErrors('type');
        $this->postJson("/api/v1/vendor/inventory/{$variant->id}/movements", ['type' => 'restock', 'quantity' => 0])->assertJsonValidationErrors('quantity');

        $this->assertSame(3, $variant->fresh()->stock);

        $other = Product::factory()->create()->variants()->first();
        $this->postJson("/api/v1/vendor/inventory/{$other->id}/movements", ['type' => 'restock', 'quantity' => 1])->assertNotFound();
        $this->patchJson("/api/v1/vendor/inventory/{$other->id}", ['cost' => 1])->assertNotFound();
    }

    public function test_lists_variants_by_stock_level_with_store_and_variant_thresholds(): void
    {
        $this->vendor->store->update(['low_stock_threshold' => 5]);
        $out = $this->variant(['stock' => 0], 'أ');
        $low = $this->variant(['stock' => 4], 'ب');
        $customLow = $this->variant(['stock' => 15, 'low_stock_threshold' => 20], 'ج');
        $in = $this->variant(['stock' => 30, 'cost' => 100], 'د');
        Product::factory()->create();

        $this->getJson('/api/v1/vendor/inventory')->assertOk()->assertJsonPath('data.*.variant_id', [$out->id, $low->id, $customLow->id, $in->id]);
        $this->getJson('/api/v1/vendor/inventory?level=low')->assertJsonPath('data.*.variant_id', [$low->id, $customLow->id]);
        $this->getJson('/api/v1/vendor/inventory?level=out')->assertJsonPath('data.*.variant_id', [$out->id]);
        $this->getJson('/api/v1/vendor/inventory?level=in')
            ->assertJsonPath('data.*.variant_id', [$in->id])
            ->assertJsonPath('data.0.stock_value', 3000)
            ->assertJsonPath('data.0.margin', 75);
        $this->getJson('/api/v1/vendor/inventory?missing_cost=1&sort=stock_desc')->assertJsonPath('data.*.variant_id', [$customLow->id, $low->id, $out->id]);

        $this->getJson('/api/v1/vendor/inventory/summary')
            ->assertOk()
            ->assertJson(['variants' => 4, 'units' => 49, 'cost_value' => 3000, 'retail_value' => 19600, 'expected_profit' => 9000, 'missing_cost' => 3, 'in' => 1, 'low' => 2, 'out' => 1, 'low_stock_threshold' => 5]);
    }

    public function test_updates_cost_thresholds_and_the_store_setting(): void
    {
        $variant = $this->variant(['stock' => 8]);

        $this->patchJson("/api/v1/vendor/inventory/{$variant->id}", ['cost' => 220, 'low_stock_threshold' => 10])
            ->assertOk()
            ->assertJsonPath('data.cost', 220)
            ->assertJsonPath('data.level', 'low');

        $this->putJson('/api/v1/vendor/inventory/settings', ['low_stock_threshold' => 2])->assertOk();
        $this->patchJson("/api/v1/vendor/inventory/{$variant->id}", ['low_stock_threshold' => null])->assertJsonPath('data.level', 'in');
    }

    public function test_alerts_the_vendor_once_when_stock_runs_low_and_when_it_runs_out(): void
    {
        $this->vendor->store->update(['low_stock_threshold' => 5]);
        $variant = $this->variant(['stock' => 8], 'فستان سهرة');

        $this->placeOrder($variant, 3);
        $this->placeOrder($variant, 2);
        $this->placeOrder($variant, 3);

        $this->assertSame(['stock_low', 'stock_out'], $this->vendor->notifications()->where('type', 'like', 'stock_%')->pluck('type')->sort()->values()->all());

        $this->getJson('/api/v1/vendor/notifications?unread=1')
            ->assertJsonFragment(['message' => 'مخزون فستان سهرة منخفض: متبقي 5 فقط'])
            ->assertJsonFragment(['message' => 'نفد مخزون فستان سهرة']);
    }

    public function test_lists_and_filters_stock_movements(): void
    {
        $dress = $this->variant(['stock' => 10], 'فستان');
        $shirt = $this->variant(['stock' => 10], 'قميص');
        $order = $this->placeOrder($dress, 2);
        $this->postJson("/api/v1/vendor/inventory/{$shirt->id}/movements", ['type' => 'restock', 'quantity' => 5]);

        $this->getJson('/api/v1/vendor/inventory/movements')->assertOk()->assertJsonCount(2, 'data')->assertJsonPath('data.0.type', 'restock');
        $this->getJson('/api/v1/vendor/inventory/movements?type=sale')
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.order.number', $order->number)
            ->assertJsonPath('data.0.quantity', -2);
        $this->getJson("/api/v1/vendor/inventory/movements?variant_id={$shirt->id}")->assertJsonPath('data.*.type', [StockMovementType::Restock->value]);
        $this->getJson('/api/v1/vendor/inventory/movements?search='.urlencode('قميص'))->assertJsonCount(1, 'data');
    }

    public function test_reports_cost_of_goods_and_gross_profit_for_delivered_orders(): void
    {
        $costed = $this->variant(['price' => 400, 'cost' => 250]);
        $uncosted = $this->variant(['price' => 300]);
        $updateStatus = app(UpdateOrderStatus::class);

        foreach ([[$costed, 2], [$uncosted, 1]] as [$variant, $quantity]) {
            $order = $this->placeOrder($variant, $quantity);

            foreach ([OrderStatus::Confirmed, OrderStatus::Shipped, OrderStatus::Delivered] as $status) {
                $order = $updateStatus->handle($order, $status, 'vendor');
            }
        }

        $this->getJson('/api/v1/vendor/reports')
            ->assertJsonPath('totals.cost_of_goods', 500)
            ->assertJsonPath('totals.gross_profit', 600)
            ->assertJsonPath('totals.profit_margin', 54.5)
            ->assertJsonPath('totals.uncosted_items', 1);
    }
}
