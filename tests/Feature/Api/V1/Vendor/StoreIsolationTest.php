<?php

namespace Tests\Feature\Api\V1\Vendor;

use App\Models\Admin;
use App\Models\Affiliate;
use App\Models\Coupon;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\Store;
use App\Models\Supplier;
use App\Models\Vendor;
use App\Support\CurrentStore;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * A vendor works inside one store: another store's records must look missing, whether the
 * controller filters by store_id itself or forgets to (the BelongsToStore scope).
 */
class StoreIsolationTest extends TestCase
{
    use RefreshDatabase;

    private Vendor $vendor;

    private Store $otherStore;

    protected function setUp(): void
    {
        parent::setUp();

        $this->vendor = $this->actingAsVendor();
        $this->otherStore = Vendor::factory()->withStore()->create()->store;
    }

    /**
     * One record of each kind the dashboard opens by id, created in the given store.
     *
     * @return array<string, int>
     */
    private function recordsIn(Store $store): array
    {
        $supplier = Supplier::factory()->for($store)->create();

        return [
            'products' => Product::factory()->for($store)->create()->id,
            'orders' => Order::factory()->for($store)->create()->id,
            'customers' => Customer::factory()->for($store)->create()->id,
            'coupons' => Coupon::factory()->for($store)->create()->id,
            'affiliates' => Affiliate::factory()->for($store)->create()->id,
            'purchase-orders' => PurchaseOrder::factory()->for($supplier)->create()->id,
        ];
    }

    public function test_another_stores_records_are_not_found(): void
    {
        $own = $this->recordsIn($this->vendor->store);
        $foreign = $this->recordsIn($this->otherStore);

        foreach ($own as $resource => $id) {
            $this->getJson("/api/v1/vendor/{$resource}/{$id}")->assertOk();
            $this->getJson("/api/v1/vendor/{$resource}/{$foreign[$resource]}")->assertNotFound();
        }
    }

    public function test_lists_only_show_the_vendors_own_store(): void
    {
        $own = $this->recordsIn($this->vendor->store);
        $this->recordsIn($this->otherStore);

        $this->getJson('/api/v1/vendor/products')->assertOk()->assertJsonPath('data.*.product_id', [$own['products']]);
        $this->getJson('/api/v1/vendor/coupons')->assertOk()->assertJsonPath('data.*.coupon_id', [$own['coupons']]);
        // The order factory adds its own customer, so the store has two.
        $this->getJson('/api/v1/vendor/customers')->assertOk()->assertJsonCount(2, 'data');
        $this->getJson('/api/v1/vendor/orders')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_another_stores_records_cannot_be_changed_or_deleted(): void
    {
        $foreign = $this->recordsIn($this->otherStore);

        $this->patchJson("/api/v1/vendor/coupons/{$foreign['coupons']}", ['description' => 'hijacked'])->assertNotFound();
        $this->deleteJson("/api/v1/vendor/coupons/{$foreign['coupons']}")->assertNotFound();
        $this->deleteJson("/api/v1/vendor/products/{$foreign['products']}")->assertNotFound();
        $this->patchJson("/api/v1/vendor/orders/{$foreign['orders']}/status", ['status' => 'cancelled'])->assertNotFound();

        $this->assertNotSame('hijacked', Coupon::find($foreign['coupons'])->description);
        $this->assertNotNull(Product::find($foreign['products']));
        $this->assertSame('pending', Order::find($foreign['orders'])->status->value);
    }

    public function test_the_scope_only_lasts_for_the_request(): void
    {
        Product::factory()->for($this->vendor->store)->create();
        Product::factory()->for($this->otherStore)->create();

        $this->getJson('/api/v1/vendor/products')->assertOk()->assertJsonCount(1, 'data');

        $this->assertNull(app(CurrentStore::class)->id());
        $this->assertSame(2, Product::count());
    }

    public function test_the_current_store_filters_every_store_owned_query(): void
    {
        $own = Product::factory()->for($this->vendor->store)->create();
        Product::factory()->for($this->otherStore)->create();

        app(CurrentStore::class)->set($this->vendor->store->id);

        $this->assertSame([$own->id], Product::pluck('id')->all());
        $this->assertSame(1, Product::query()->withoutGlobalScope('store')->where('store_id', $this->otherStore->id)->count());
    }

    public function test_the_admin_panel_still_sees_every_store(): void
    {
        Order::factory()->for($this->vendor->store)->create();
        Order::factory()->for($this->otherStore)->create();

        Sanctum::actingAs(Admin::factory()->create(), [Admin::TOKEN_ABILITY]);

        $this->getJson('/api/v1/admin/orders')->assertOk()->assertJsonCount(2, 'data');
    }
}
