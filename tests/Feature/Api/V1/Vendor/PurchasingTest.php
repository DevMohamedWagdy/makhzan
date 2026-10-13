<?php

namespace Tests\Feature\Api\V1\Vendor;

use App\Enums\PurchaseOrderStatus;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\PurchaseOrder;
use App\Models\Supplier;
use App\Models\Vendor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PurchasingTest extends TestCase
{
    use RefreshDatabase;

    private Vendor $vendor;

    private Supplier $supplier;

    protected function setUp(): void
    {
        parent::setUp();

        $this->vendor = $this->actingAsVendor();
        $this->supplier = Supplier::factory()->for($this->vendor->store)->create(['name' => 'مصنع النور']);
    }

    private function variant(array $attributes = [], string $name = 'فستان'): ProductVariant
    {
        $variant = Product::factory()->for($this->vendor->store)->create(['name' => $name])->variants()->sole();
        $variant->update(['price' => 400, 'stock' => 10, 'cost' => null, ...$attributes]);

        return $variant;
    }

    private function createOrder(array $items): array
    {
        return $this->postJson('/api/v1/vendor/purchase-orders', ['supplier_id' => $this->supplier->id, 'expected_at' => '2026-11-01', 'items' => $items])
            ->assertCreated()
            ->json('data');
    }

    public function test_manages_suppliers_and_keeps_those_with_orders(): void
    {
        $id = $this->postJson('/api/v1/vendor/suppliers', ['name' => 'شركة الأقمشة', 'phone' => '01011112222'])->assertCreated()->json('data.supplier_id');
        $this->putJson("/api/v1/vendor/suppliers/{$id}", ['name' => 'شركة الأقمشة الحديثة'])->assertOk()->assertJsonPath('data.name', 'شركة الأقمشة الحديثة');
        $this->postJson('/api/v1/vendor/suppliers', [])->assertJsonValidationErrors('name');

        PurchaseOrder::factory()->for($this->supplier)->create(['store_id' => $this->vendor->store->id]);

        $this->getJson('/api/v1/vendor/suppliers')->assertOk()->assertJsonPath('data.*.name', ['شركة الأقمشة الحديثة', 'مصنع النور'])->assertJsonPath('data.1.purchase_orders_count', 1);
        $this->deleteJson("/api/v1/vendor/suppliers/{$this->supplier->id}")->assertJsonValidationErrors('supplier');
        $this->deleteJson("/api/v1/vendor/suppliers/{$id}")->assertNoContent();
        $this->putJson('/api/v1/vendor/suppliers/'.Supplier::factory()->create()->id, ['name' => 'x'])->assertNotFound();
    }

    public function test_creates_numbered_drafts_and_edits_them_until_goods_arrive(): void
    {
        $dress = $this->variant();
        $shirt = $this->variant([], 'قميص');

        $first = $this->createOrder([['variant_id' => $dress->id, 'quantity' => 20, 'unit_cost' => 150]]);
        $second = $this->createOrder([['variant_id' => $shirt->id, 'quantity' => 5, 'unit_cost' => 80]]);

        $this->assertSame([1, 2], [$first['number'], $second['number']]);
        $this->assertSame('draft', $first['status']);
        $this->assertEquals(3000, $first['total']);

        $this->putJson("/api/v1/vendor/purchase-orders/{$first['purchase_order_id']}", ['supplier_id' => $this->supplier->id, 'items' => [
            ['variant_id' => $dress->id, 'quantity' => 10, 'unit_cost' => 150],
            ['variant_id' => $shirt->id, 'quantity' => 4, 'unit_cost' => 90],
        ]])->assertOk()->assertJsonCount(2, 'data.items')->assertJsonPath('data.total', 1860);

        $this->postJson('/api/v1/vendor/purchase-orders', ['supplier_id' => $this->supplier->id, 'items' => [
            ['variant_id' => $dress->id, 'quantity' => 1, 'unit_cost' => 1],
            ['variant_id' => $dress->id, 'quantity' => 1, 'unit_cost' => 1],
        ]])->assertJsonValidationErrors('items.1.variant_id');

        $foreign = Product::factory()->create()->variants()->first();
        $this->postJson('/api/v1/vendor/purchase-orders', ['supplier_id' => Supplier::factory()->create()->id, 'items' => [['variant_id' => $foreign->id, 'quantity' => 1, 'unit_cost' => 1]]])
            ->assertJsonValidationErrors(['supplier_id', 'items.0.variant_id']);
    }

    public function test_receiving_in_parts_restocks_at_the_order_cost_and_completes_the_order(): void
    {
        $dress = $this->variant(['stock' => 10, 'cost' => 100]);
        $order = $this->createOrder([['variant_id' => $dress->id, 'quantity' => 30, 'unit_cost' => 140]]);
        $itemId = $order['items'][0]['item_id'];
        $id = $order['purchase_order_id'];

        $this->postJson("/api/v1/vendor/purchase-orders/{$id}/order")->assertOk()->assertJsonPath('data.status', 'ordered');

        $this->postJson("/api/v1/vendor/purchase-orders/{$id}/receive", ['items' => [['item_id' => $itemId, 'quantity' => 40]]])->assertJsonValidationErrors("items.{$itemId}");
        $this->postJson("/api/v1/vendor/purchase-orders/{$id}/receive", ['items' => [['item_id' => $itemId, 'quantity' => 0]]])->assertJsonValidationErrors('items');

        $this->postJson("/api/v1/vendor/purchase-orders/{$id}/receive", ['items' => [['item_id' => $itemId, 'quantity' => 10]]])
            ->assertOk()
            ->assertJsonPath('data.status', 'partial')
            ->assertJsonPath('data.items.0.remaining', 20)
            ->assertJsonPath('data.can_edit', false);

        $this->assertSame(20, $dress->fresh()->stock);
        $this->assertSame(120.0, $dress->fresh()->cost);

        $this->putJson("/api/v1/vendor/purchase-orders/{$id}", ['supplier_id' => $this->supplier->id, 'items' => [['variant_id' => $dress->id, 'quantity' => 1, 'unit_cost' => 1]]])->assertJsonValidationErrors('status');
        $this->postJson("/api/v1/vendor/purchase-orders/{$id}/cancel")->assertJsonValidationErrors('status');

        $this->postJson("/api/v1/vendor/purchase-orders/{$id}/receive", ['items' => [['item_id' => $itemId, 'quantity' => 20]], 'note' => 'الدفعة الثانية'])
            ->assertJsonPath('data.status', 'received')
            ->assertJsonPath('data.received_total', 4200);

        $this->assertSame(40, $dress->fresh()->stock);

        $this->getJson('/api/v1/vendor/inventory/movements?type=restock')
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.purchase_order.number', 1)
            ->assertJsonPath('data.0.note', 'استلام أمر الشراء #1 — الدفعة الثانية');
    }

    public function test_closes_partial_orders_cancels_untouched_ones_and_deletes_drafts(): void
    {
        $dress = $this->variant();
        $partial = $this->createOrder([['variant_id' => $dress->id, 'quantity' => 10, 'unit_cost' => 100]]);
        $this->postJson("/api/v1/vendor/purchase-orders/{$partial['purchase_order_id']}/receive", ['items' => [['item_id' => $partial['items'][0]['item_id'], 'quantity' => 4]]])->assertOk();
        $this->postJson("/api/v1/vendor/purchase-orders/{$partial['purchase_order_id']}/close")->assertOk()->assertJsonPath('data.status', 'closed');
        $this->postJson("/api/v1/vendor/purchase-orders/{$partial['purchase_order_id']}/receive", ['items' => [['item_id' => $partial['items'][0]['item_id'], 'quantity' => 1]]])->assertJsonValidationErrors('status');

        $ordered = $this->createOrder([['variant_id' => $dress->id, 'quantity' => 3, 'unit_cost' => 100]]);
        $this->postJson("/api/v1/vendor/purchase-orders/{$ordered['purchase_order_id']}/order")->assertOk();
        $this->deleteJson("/api/v1/vendor/purchase-orders/{$ordered['purchase_order_id']}")->assertJsonValidationErrors('status');
        $this->postJson("/api/v1/vendor/purchase-orders/{$ordered['purchase_order_id']}/cancel")->assertOk()->assertJsonPath('data.status', 'cancelled');

        $draft = $this->createOrder([['variant_id' => $dress->id, 'quantity' => 3, 'unit_cost' => 100]]);
        $this->deleteJson("/api/v1/vendor/purchase-orders/{$draft['purchase_order_id']}")->assertNoContent();

        $this->assertSame(14, $dress->fresh()->stock);
    }

    public function test_lists_purchase_orders_with_status_counts_and_value_on_order(): void
    {
        $dress = $this->variant();
        $ordered = $this->createOrder([['variant_id' => $dress->id, 'quantity' => 10, 'unit_cost' => 100]]);
        $this->postJson("/api/v1/vendor/purchase-orders/{$ordered['purchase_order_id']}/order");
        $this->createOrder([['variant_id' => $dress->id, 'quantity' => 2, 'unit_cost' => 100]]);
        PurchaseOrder::factory()->create();

        $this->getJson('/api/v1/vendor/purchase-orders')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('summary.draft', 1)
            ->assertJsonPath('summary.ordered', 1)
            ->assertJsonPath('summary.units_on_order', 10)
            ->assertJsonPath('summary.value_on_order', 1000);

        $this->getJson('/api/v1/vendor/purchase-orders?status=ordered')->assertJsonPath('data.*.number', [1]);
        $this->getJson('/api/v1/vendor/purchase-orders?search=%232')->assertJsonPath('data.*.number', [2]);
        $this->getJson('/api/v1/vendor/purchase-orders/'.PurchaseOrder::factory()->create()->id)->assertNotFound();
        $this->assertSame(PurchaseOrderStatus::Ordered, PurchaseOrder::firstWhere('number', 1)->status);
    }

    public function test_exports_and_imports_counted_stock_and_costs(): void
    {
        $dress = $this->variant(['stock' => 10, 'sku' => 'DR-1']);
        $shirt = $this->variant(['stock' => 5, 'sku' => 'SH-1'], 'قميص');
        $this->variant(['stock' => 1, 'sku' => 'DUP'], 'أ');
        $this->variant(['stock' => 1, 'sku' => 'dup'], 'ب');

        $this->getJson('/api/v1/vendor/inventory/export')->assertOk()->assertJsonCount(4, 'data');

        $this->postJson('/api/v1/vendor/inventory/import', ['rows' => [
            ['line' => 2, 'variant_id' => (string) $dress->id, 'stock' => '12', 'cost' => '150'],
            ['line' => 3, 'sku' => 'sh-1', 'stock' => '5', 'cost' => ''],
            ['line' => 4, 'sku' => 'DUP', 'stock' => '3'],
            ['line' => 5, 'variant_id' => '999999', 'stock' => '3'],
            ['line' => 6, 'sku' => 'SH-1', 'stock' => '-2'],
        ]])
            ->assertOk()
            ->assertJson(['updated' => 1, 'unchanged' => 1, 'skipped' => 3])
            ->assertJsonPath('errors.0', ['row' => 4, 'message' => 'رمز SKU مستخدم لأكثر من منتج، استخدم variant_id'])
            ->assertJsonPath('errors.1.row', 5)
            ->assertJsonPath('errors.2.row', 6);

        $this->assertSame(12, $dress->fresh()->stock);
        $this->assertSame(150.0, $dress->fresh()->cost);
        $this->assertSame(5, $shirt->fresh()->stock);
        $this->assertSame('adjustment', $dress->stockMovements()->sole()->type->value);
    }
}
