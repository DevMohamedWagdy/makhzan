<?php

namespace Tests\Feature\Api\V1\Vendor;

use App\Enums\OrderStatus;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\Product;
use App\Models\Vendor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CouponControllerTest extends TestCase
{
    use RefreshDatabase;

    private Vendor $vendor;

    protected function setUp(): void
    {
        parent::setUp();

        $this->vendor = $this->actingAsVendor();
    }

    private function payload(array $overrides = []): array
    {
        return ['code' => 'eid 25', 'type' => 'percentage', 'value' => 25, 'applies_to' => 'all', ...$overrides];
    }

    public function test_creates_and_updates_coupons(): void
    {
        $id = $this->postJson('/api/v1/vendor/coupons', $this->payload(['max_discount' => 200, 'per_customer_limit' => 1]))
            ->assertCreated()
            ->assertJsonPath('data.code', 'EID25')
            ->assertJsonPath('data.state', 'active')
            ->assertJsonPath('data.stats.uses', 0)
            ->json('data.coupon_id');

        $product = Product::factory()->for($this->vendor->store)->create();

        $this->putJson("/api/v1/vendor/coupons/{$id}", $this->payload(['code' => 'EID25', 'type' => 'free_shipping', 'value' => null, 'max_discount' => 200, 'applies_to' => 'products', 'product_ids' => [$product->id]]))
            ->assertOk()
            ->assertJsonPath('data.type', 'free_shipping')
            ->assertJsonPath('data.value', null)
            ->assertJsonPath('data.max_discount', null)
            ->assertJsonPath('data.product_ids', [$product->id]);
    }

    public function test_validates_coupons(): void
    {
        Coupon::factory()->for($this->vendor->store)->create(['code' => 'TAKEN']);

        $this->postJson('/api/v1/vendor/coupons', $this->payload(['code' => 'taken']))->assertJsonValidationErrors(['code' => 'هذا الكود مستخدم لكوبون آخر']);
        $this->postJson('/api/v1/vendor/coupons', $this->payload(['code' => 'خصم']))->assertJsonValidationErrors('code');
        $this->postJson('/api/v1/vendor/coupons', $this->payload(['value' => 120]))->assertJsonValidationErrors(['value' => 'النسبة لا تزيد عن 100%']);
        $this->postJson('/api/v1/vendor/coupons', $this->payload(['value' => null]))->assertJsonValidationErrors('value');
        $this->postJson('/api/v1/vendor/coupons', $this->payload(['applies_to' => 'categories']))->assertJsonValidationErrors('category_ids');
        $this->postJson('/api/v1/vendor/coupons', $this->payload(['applies_to' => 'products', 'product_ids' => [Product::factory()->create()->id]]))->assertJsonValidationErrors('product_ids.0');
        $this->postJson('/api/v1/vendor/coupons', $this->payload(['starts_at' => now()->addWeek()->toIso8601String(), 'ends_at' => now()->addDay()->toIso8601String()]))->assertJsonValidationErrors('ends_at');
    }

    public function test_lists_coupons_by_state_with_their_stats(): void
    {
        $store = $this->vendor->store;
        $active = Coupon::factory()->for($store)->create(['code' => 'ACTIVE']);
        Coupon::factory()->for($store)->create(['code' => 'SOON', 'starts_at' => now()->addDay()]);
        Coupon::factory()->for($store)->create(['code' => 'OLD', 'ends_at' => now()->subDay()]);
        $usedUp = Coupon::factory()->for($store)->create(['code' => 'ONCE', 'usage_limit' => 1]);
        Coupon::factory()->for($store)->create(['code' => 'OFF', 'is_active' => false]);
        Coupon::factory()->create();

        Order::factory()->for($store)->create(['coupon_id' => $active->id, 'discount' => 50, 'total' => 450]);
        Order::factory()->for($store)->status(OrderStatus::Cancelled)->create(['coupon_id' => $active->id, 'discount' => 80]);
        Order::factory()->for($store)->create(['coupon_id' => $usedUp->id, 'discount' => 20, 'shipping_discount' => 50]);

        $this->getJson('/api/v1/vendor/coupons')
            ->assertOk()
            ->assertJsonCount(5, 'data')
            ->assertJsonPath('summary', ['active' => 1, 'scheduled' => 1, 'expired' => 2, 'disabled' => 1, 'total' => 5, 'orders' => 2, 'discounts' => 120]);

        $this->getJson('/api/v1/vendor/coupons?state=expired')->assertJsonPath('data.*.code', ['ONCE', 'OLD']);
        $this->getJson('/api/v1/vendor/coupons?state=active')
            ->assertJsonPath('data.0.code', 'ACTIVE')
            ->assertJsonPath('data.0.stats', ['uses' => 1, 'discount_total' => 50, 'sales_total' => 450]);
        $this->getJson('/api/v1/vendor/coupons?search=onc')->assertJsonPath('data.*.code', ['ONCE']);
    }

    public function test_disables_used_coupons_and_deletes_unused_ones(): void
    {
        $used = Coupon::factory()->for($this->vendor->store)->create();
        Order::factory()->for($this->vendor->store)->create(['coupon_id' => $used->id]);
        $unused = Coupon::factory()->for($this->vendor->store)->create();

        $this->deleteJson("/api/v1/vendor/coupons/{$used->id}")->assertJsonValidationErrors('coupon');
        $this->patchJson("/api/v1/vendor/coupons/{$used->id}/status", ['is_active' => false])->assertOk()->assertJsonPath('data.state', 'disabled');
        $this->deleteJson("/api/v1/vendor/coupons/{$unused->id}")->assertNoContent();
        $this->getJson('/api/v1/vendor/coupons/'.Coupon::factory()->create()->id)->assertNotFound();
    }
}
