<?php

namespace Tests\Feature\Api\V1\Vendor;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\PurchaseReturn;
use App\Models\StoreRole;
use App\Models\Supplier;
use App\Models\SupplierPayment;
use App\Models\Vendor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SupplierAccountsTest extends TestCase
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

    private function variant(array $attributes = []): ProductVariant
    {
        $variant = Product::factory()->for($this->vendor->store)->create(['name' => 'فستان'])->variants()->sole();
        $variant->update(['price' => 400, 'stock' => 0, 'cost' => null, ...$attributes]);

        return $variant;
    }

    /**
     * Orders and fully receives `quantity` units at `unitCost` from the supplier.
     */
    private function receive(ProductVariant $variant, int $quantity, float $unitCost): void
    {
        $order = $this->postJson('/api/v1/vendor/purchase-orders', ['supplier_id' => $this->supplier->id, 'items' => [['variant_id' => $variant->id, 'quantity' => $quantity, 'unit_cost' => $unitCost]]])->json('data');

        $this->postJson("/api/v1/vendor/purchase-orders/{$order['purchase_order_id']}/order")->assertOk();
        $this->postJson("/api/v1/vendor/purchase-orders/{$order['purchase_order_id']}/receive", ['items' => [['item_id' => $order['items'][0]['item_id'], 'quantity' => $quantity]]])->assertOk();
    }

    public function test_the_account_adds_received_goods_and_takes_off_payments_and_returns(): void
    {
        $dress = $this->variant();
        $this->receive($dress, 10, 150);
        $warehouseId = $this->vendor->store->defaultWarehouse()->id;

        $this->postJson("/api/v1/vendor/suppliers/{$this->supplier->id}/payments", ['amount' => 500, 'paid_at' => now()->toDateString(), 'method' => 'cash', 'reference' => 'R-1'])
            ->assertCreated()
            ->assertJsonPath('data.account.balance', 1000);

        $this->postJson("/api/v1/vendor/suppliers/{$this->supplier->id}/returns", ['warehouse_id' => $warehouseId, 'note' => 'عيب صناعة', 'items' => [['variant_id' => $dress->id, 'quantity' => 2, 'unit_cost' => 150]]])
            ->assertCreated()
            ->assertJsonPath('data.number', 1)
            ->assertJsonPath('data.total', 300);

        $this->assertSame(8, $dress->fresh()->stock);

        $this->getJson("/api/v1/vendor/suppliers/{$this->supplier->id}/account")
            ->assertOk()
            ->assertJsonPath('data.account', ['received' => 1500, 'returned' => 300, 'paid' => 500, 'balance' => 700])
            ->assertJsonPath('data.entries.*.type', ['return', 'payment', 'receipt'])
            ->assertJsonPath('data.entries.*.balance', [700, 1000, 1500]);

        $this->getJson('/api/v1/vendor/inventory/movements?type=supplier_return')->assertJsonCount(1, 'data');

        $this->getJson('/api/v1/vendor/suppliers')
            ->assertJsonPath('data.0.account.balance', 700)
            ->assertJsonPath('total_due', 700);

        $payment = SupplierPayment::query()->sole();
        $this->deleteJson("/api/v1/vendor/suppliers/{$this->supplier->id}/payments/{$payment->id}")->assertOk()->assertJsonPath('data.account.balance', 1200);
    }

    public function test_a_return_cannot_take_more_than_the_warehouse_holds(): void
    {
        $dress = $this->variant();
        $this->receive($dress, 3, 100);

        $this->postJson("/api/v1/vendor/suppliers/{$this->supplier->id}/returns", ['warehouse_id' => $this->vendor->store->defaultWarehouse()->id, 'items' => [['variant_id' => $dress->id, 'quantity' => 5, 'unit_cost' => 100]]])
            ->assertJsonValidationErrors('items.0.quantity');

        $this->assertSame(3, $dress->fresh()->stock);
        $this->assertSame(0, PurchaseReturn::query()->count());
    }

    public function test_validates_payments_and_keeps_other_stores_out(): void
    {
        $this->postJson("/api/v1/vendor/suppliers/{$this->supplier->id}/payments", ['amount' => 0, 'paid_at' => now()->addDay()->toDateString(), 'method' => 'barter'])
            ->assertJsonValidationErrors(['amount', 'paid_at', 'method']);

        $foreign = Supplier::factory()->create();
        $this->getJson("/api/v1/vendor/suppliers/{$foreign->id}/account")->assertNotFound();
        $this->postJson("/api/v1/vendor/suppliers/{$foreign->id}/payments", ['amount' => 10, 'paid_at' => now()->toDateString(), 'method' => 'cash'])->assertNotFound();

        $otherSupplier = Supplier::factory()->for($this->vendor->store)->create();
        $payment = SupplierPayment::factory()->create(['store_id' => $this->vendor->store->id, 'supplier_id' => $otherSupplier->id]);
        $this->deleteJson("/api/v1/vendor/suppliers/{$this->supplier->id}/payments/{$payment->id}")->assertNotFound();
        $this->assertModelExists($payment);
    }

    public function test_a_supplier_with_payments_cannot_be_deleted(): void
    {
        SupplierPayment::factory()->create(['store_id' => $this->vendor->store->id, 'supplier_id' => $this->supplier->id]);

        $this->deleteJson("/api/v1/vendor/suppliers/{$this->supplier->id}")->assertJsonValidationErrors('supplier');
        $this->assertModelExists($this->supplier);
    }

    public function test_viewers_see_the_account_but_cannot_record_payments(): void
    {
        $store = $this->vendor->store;
        $role = StoreRole::factory()->for($store)->allowing(['suppliers.view'])->create();

        Sanctum::actingAs($store->staff()->create(['full_name' => 'Viewer', 'phone' => '01055554444', 'email' => 'viewer@x.test', 'password' => 'Staff2026pass', 'role_id' => $role->id]), [Vendor::TOKEN_ABILITY]);

        $this->getJson("/api/v1/vendor/suppliers/{$this->supplier->id}/account")->assertOk();
        $this->postJson("/api/v1/vendor/suppliers/{$this->supplier->id}/payments", ['amount' => 10, 'paid_at' => now()->toDateString(), 'method' => 'cash'])->assertForbidden();
        $this->postJson("/api/v1/vendor/suppliers/{$this->supplier->id}/returns", ['warehouse_id' => $store->defaultWarehouse()->id, 'items' => []])->assertForbidden();
    }
}
