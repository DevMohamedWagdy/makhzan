<?php

namespace Tests\Feature\Api\V1\Vendor;

use App\Actions\Inventory\ChangeStock;
use App\Actions\Orders\PlaceOrder;
use App\Actions\Orders\UpdateOrderStatus;
use App\Enums\OrderStatus;
use App\Enums\StockMovementType;
use App\Models\Customer;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\ProductVariant;
use App\Models\Store;
use App\Models\Supplier;
use App\Models\Vendor;
use App\Models\Warehouse;
use App\Models\WarehouseStock;
use App\Notifications\StockAlertNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class WarehouseTest extends TestCase
{
    use RefreshDatabase;

    private Vendor $vendor;

    private Warehouse $main;

    private Warehouse $branch;

    protected function setUp(): void
    {
        parent::setUp();

        $this->vendor = $this->actingAsVendor();
        $this->vendor->store->forceFill(['default_shipping_price' => 50])->save();
        $this->main = $this->vendor->store->defaultWarehouse();
        $this->branch = $this->vendor->store->warehouses()->create(['name' => 'فرع الإسكندرية', 'priority' => 2]);
    }

    /**
     * A variant holding the given quantities: [main, branch].
     */
    private function variant(int $main, int $branch, string $name = 'فستان'): ProductVariant
    {
        $variant = Product::factory()->for($this->vendor->store)->create(['name' => $name])->variants()->sole();
        $variant->update(['price' => 400, 'stock' => 0]);
        $changeStock = app(ChangeStock::class);
        $changeStock->by($variant, $main, StockMovementType::Restock, 'vendor', warehouse: $this->main);
        $changeStock->by($variant, $branch, StockMovementType::Restock, 'vendor', warehouse: $this->branch);

        return $variant->fresh();
    }

    /**
     * @return array{0: int, 1: int}
     */
    private function stocks(ProductVariant $variant): array
    {
        $stock = fn (Warehouse $warehouse): int => (int) WarehouseStock::query()->where(['warehouse_id' => $warehouse->id, 'product_variant_id' => $variant->id])->value('stock');

        return [$stock($this->main), $stock($this->branch)];
    }

    private function placeOrder(ProductVariant $variant, int $quantity, string $governorate = 'cairo', string $city = 'maadi')
    {
        return app(PlaceOrder::class)->handle($this->vendor->store, Customer::factory()->for($this->vendor->store)->create(), [['variant_id' => $variant->id, 'quantity' => $quantity]], [
            'recipient_name' => 'منى', 'phone' => '01012345678', 'governorate_id' => $governorate, 'city_id' => $city, 'address_line' => '5 شارع 9',
        ]);
    }

    public function test_every_new_store_starts_with_a_main_warehouse(): void
    {
        $store = Store::factory()->create();

        $this->assertSame([Warehouse::DEFAULT_NAME], $store->warehouses()->pluck('name')->all());
    }

    public function test_orders_take_stock_by_priority_and_cancellations_put_it_back_where_it_came_from(): void
    {
        $variant = $this->variant(3, 10);

        $order = $this->placeOrder($variant, 5);

        $this->assertSame([0, 8], $this->stocks($variant));
        $this->assertSame(8, $variant->fresh()->stock);

        app(UpdateOrderStatus::class)->handle($order, OrderStatus::Cancelled, 'vendor');

        $this->assertSame([3, 10], $this->stocks($variant));
        $this->assertSame(13, $variant->fresh()->stock);
    }

    public function test_orders_prefer_a_warehouse_in_the_customers_governorate(): void
    {
        $this->branch->update(['governorate_id' => 'alexandria']);
        $variant = $this->variant(10, 4);

        $this->placeOrder($variant, 3, 'alexandria', 'smouha');
        $this->assertSame([10, 1], $this->stocks($variant), 'Taken from the Alexandria branch.');

        $this->placeOrder($variant, 3, 'alexandria', 'smouha');
        $this->assertSame([8, 0], $this->stocks($variant), 'The branch runs out, the rest comes by priority.');

        $this->placeOrder($variant, 2);
        $this->assertSame([6, 0], $this->stocks($variant), 'Other governorates follow the priority order.');
    }

    public function test_the_order_shows_what_to_pick_from_each_warehouse(): void
    {
        $variant = $this->variant(3, 10, 'فستان سهرة');
        $order = $this->placeOrder($variant, 5);

        $this->getJson("/api/v1/vendor/orders/{$order->id}")
            ->assertOk()
            ->assertJsonPath('data.fulfillment', [
                ['warehouse_id' => $this->main->id, 'name' => Warehouse::DEFAULT_NAME, 'items' => [['variant_id' => $variant->id, 'product_name' => 'فستان سهرة', 'variant_title' => null, 'quantity' => 3]]],
                ['warehouse_id' => $this->branch->id, 'name' => 'فرع الإسكندرية', 'items' => [['variant_id' => $variant->id, 'product_name' => 'فستان سهرة', 'variant_title' => null, 'quantity' => 2]]],
            ]);

        $this->branch->delete();

        $this->getJson("/api/v1/vendor/orders/{$order->id}")->assertJsonPath('data.fulfillment', null);
    }

    public function test_reordering_changes_which_warehouse_sells_first(): void
    {
        $variant = $this->variant(5, 5);

        $this->putJson('/api/v1/vendor/warehouses/order', ['warehouse_ids' => [$this->branch->id, $this->main->id]])
            ->assertOk()
            ->assertJsonPath('data.0.warehouse_id', $this->branch->id);
        $this->putJson('/api/v1/vendor/warehouses/order', ['warehouse_ids' => [$this->branch->id]])->assertJsonValidationErrors('warehouse_ids');

        $this->placeOrder($variant, 2);

        $this->assertSame([5, 3], $this->stocks($variant));
    }

    public function test_transfers_move_stock_between_warehouses_without_changing_the_total(): void
    {
        $dress = $this->variant(10, 0);
        $shirt = $this->variant(4, 0, 'قميص');

        $this->postJson('/api/v1/vendor/stock-transfers', ['from_warehouse_id' => $this->main->id, 'to_warehouse_id' => $this->branch->id, 'note' => 'تجهيز الفرع', 'items' => [
            ['variant_id' => $dress->id, 'quantity' => 6],
            ['variant_id' => $shirt->id, 'quantity' => 4],
        ]])
            ->assertCreated()
            ->assertJsonPath('data.number', 1)
            ->assertJsonPath('data.units', 10)
            ->assertJsonPath('data.to_warehouse.name', 'فرع الإسكندرية');

        $this->assertSame([4, 6], $this->stocks($dress));
        $this->assertSame([0, 4], $this->stocks($shirt));
        $this->assertSame(10, $dress->fresh()->stock);

        $this->getJson("/api/v1/vendor/inventory/movements?type=transfer&warehouse_id={$this->branch->id}")
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.transfer.number', 1)
            ->assertJsonPath('data.0.warehouse_stock_after', 4);

        $this->postJson('/api/v1/vendor/stock-transfers', ['from_warehouse_id' => $this->main->id, 'to_warehouse_id' => $this->branch->id, 'items' => [['variant_id' => $dress->id, 'quantity' => 5]]])
            ->assertJsonValidationErrors('items.0.quantity');
        $this->postJson('/api/v1/vendor/stock-transfers', ['from_warehouse_id' => $this->main->id, 'to_warehouse_id' => $this->main->id, 'items' => [['variant_id' => $dress->id, 'quantity' => 1]]])
            ->assertJsonValidationErrors('to_warehouse_id');
        $this->assertSame([4, 6], $this->stocks($dress));
        $this->assertSame(1, $this->vendor->store->stockTransfers()->count());
    }

    public function test_moving_all_of_a_products_stock_to_another_warehouse_does_not_alert_that_it_ran_out(): void
    {
        $dress = $this->variant(10, 0);
        Notification::fake();

        $this->postJson('/api/v1/vendor/stock-transfers', ['from_warehouse_id' => $this->main->id, 'to_warehouse_id' => $this->branch->id, 'items' => [['variant_id' => $dress->id, 'quantity' => 10]]])
            ->assertCreated();

        $this->assertSame([0, 10], $this->stocks($dress));
        Notification::assertNothingSentTo($this->vendor, StockAlertNotification::class);
    }

    public function test_manual_movements_apply_to_the_chosen_warehouse(): void
    {
        $variant = $this->variant(10, 2);

        $this->postJson("/api/v1/vendor/inventory/{$variant->id}/movements", ['type' => 'restock', 'quantity' => 5, 'warehouse_id' => $this->branch->id])->assertCreated();
        $this->postJson("/api/v1/vendor/inventory/{$variant->id}/movements", ['type' => 'adjustment', 'quantity' => 6, 'warehouse_id' => $this->branch->id])->assertCreated();
        $this->postJson("/api/v1/vendor/inventory/{$variant->id}/movements", ['type' => 'damage', 'quantity' => 7, 'warehouse_id' => $this->branch->id])->assertJsonValidationErrors('quantity');
        $this->postJson("/api/v1/vendor/inventory/{$variant->id}/movements", ['type' => 'damage', 'quantity' => 1, 'warehouse_id' => Warehouse::factory()->create()->id])->assertJsonValidationErrors('warehouse_id');

        $this->assertSame([10, 6], $this->stocks($variant));

        $this->getJson('/api/v1/vendor/inventory')
            ->assertJsonPath('data.0.stock', 16)
            ->assertJsonPath('data.0.warehouses', [
                ['warehouse_id' => $this->main->id, 'name' => Warehouse::DEFAULT_NAME, 'stock' => 10],
                ['warehouse_id' => $this->branch->id, 'name' => 'فرع الإسكندرية', 'stock' => 6],
            ]);

        $this->getJson('/api/v1/vendor/inventory/summary')->assertJsonPath('warehouses.1.units', 6);
    }

    public function test_the_product_form_quantity_is_the_total_and_changes_land_in_the_default_warehouse(): void
    {
        $category = ProductCategory::factory()->for($this->vendor->store)->create();
        $variant = $this->variant(5, 4);
        $product = $variant->product;
        $payload = fn (int $stock): array => ['category_id' => $category->id, 'name' => $product->name, 'status' => 'active', 'options' => [], 'variants' => [['id' => $variant->id, 'price' => 400, 'stock' => $stock]]];

        $this->putJson("/api/v1/vendor/products/{$product->id}", $payload(12))->assertOk();
        $this->assertSame([8, 4], $this->stocks($variant));

        $this->putJson("/api/v1/vendor/products/{$product->id}", $payload(3))->assertJsonValidationErrors('variants.0.stock');
        $this->assertSame([8, 4], $this->stocks($variant));
    }

    public function test_purchase_orders_receive_into_their_warehouse(): void
    {
        $variant = $this->variant(0, 0);
        $supplier = Supplier::factory()->for($this->vendor->store)->create();

        $order = $this->postJson('/api/v1/vendor/purchase-orders', ['supplier_id' => $supplier->id, 'warehouse_id' => $this->branch->id, 'items' => [['variant_id' => $variant->id, 'quantity' => 8, 'unit_cost' => 100]]])
            ->assertCreated()
            ->assertJsonPath('data.warehouse.name', 'فرع الإسكندرية')
            ->json('data');

        $this->postJson("/api/v1/vendor/purchase-orders/{$order['purchase_order_id']}/receive", ['items' => [['item_id' => $order['items'][0]['item_id'], 'quantity' => 8]]])->assertOk();

        $this->assertSame([0, 8], $this->stocks($variant));
    }

    public function test_imports_counts_into_the_chosen_warehouse(): void
    {
        $variant = $this->variant(5, 5);

        $this->postJson('/api/v1/vendor/inventory/import', ['warehouse_id' => $this->branch->id, 'rows' => [['variant_id' => (string) $variant->id, 'stock' => '2']]])->assertJson(['updated' => 1]);

        $this->assertSame([5, 2], $this->stocks($variant));
    }

    public function test_manages_warehouses_and_only_deletes_empty_ones(): void
    {
        $id = $this->postJson('/api/v1/vendor/warehouses', ['name' => 'مخزن المعادي', 'address' => 'شارع 9'])->assertCreated()->json('data.warehouse_id');
        $this->postJson('/api/v1/vendor/warehouses', ['name' => 'مخزن المعادي'])->assertJsonValidationErrors('name');
        $this->putJson("/api/v1/vendor/warehouses/{$id}", ['name' => 'مخزن المعادي الجديد'])->assertOk();
        $this->variant(1, 3);

        $this->getJson('/api/v1/vendor/warehouses')
            ->assertOk()
            ->assertJsonPath('data.*.name', [Warehouse::DEFAULT_NAME, 'فرع الإسكندرية', 'مخزن المعادي الجديد'])
            ->assertJsonPath('data.1.units', 3);

        $this->deleteJson("/api/v1/vendor/warehouses/{$this->branch->id}")->assertJsonValidationErrors('warehouse');
        $this->deleteJson("/api/v1/vendor/warehouses/{$id}")->assertNoContent();
        $this->deleteJson('/api/v1/vendor/warehouses/'.Warehouse::factory()->create()->id)->assertNotFound();
    }

    public function test_stock_set_outside_warehouses_counts_as_being_in_the_default_one(): void
    {
        $variant = Product::factory()->for($this->vendor->store)->create()->variants()->sole();
        $variant->update(['stock' => 7]);

        $this->placeOrder($variant, 2);

        $this->assertSame([5, 0], $this->stocks($variant));
    }
}
