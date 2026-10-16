<?php

namespace Tests\Feature\Api\V1\Vendor;

use App\Enums\OrderSource;
use App\Enums\ProductStatus;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\StoreRole;
use App\Models\Vendor;
use App\Notifications\OrderPlacedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ManualOrderTest extends TestCase
{
    use RefreshDatabase;

    private Vendor $vendor;

    private ProductVariant $variant;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
        $this->vendor = $this->actingAsVendor();
        $this->vendor->store->forceFill(['default_shipping_price' => 50])->save();
        $this->variant = Product::factory()->for($this->vendor->store)->create(['name' => 'فستان'])->variants()->first();
        $this->variant->update(['price' => 300, 'stock' => 5]);
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return [
            'source' => 'whatsapp',
            'items' => [['variant_id' => $this->variant->id, 'quantity' => 2]],
            'address' => ['recipient_name' => 'منى أحمد', 'phone' => '010 1234 5678', 'governorate_id' => 'cairo', 'city_id' => 'maadi', 'address_line' => '5 شارع 9'],
            ...$overrides,
        ];
    }

    public function test_records_a_whatsapp_order_for_a_new_customer_and_deducts_stock(): void
    {
        $this->postJson('/api/v1/vendor/orders', $this->payload(['note' => 'التسليم بعد الساعة 5']))
            ->assertCreated()
            ->assertJsonPath('data.number', 1001)
            ->assertJsonPath('data.source', 'whatsapp')
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.payment_method', 'cod')
            ->assertJsonPath('data.subtotal', 600)
            ->assertJsonPath('data.shipping_fee', 50)
            ->assertJsonPath('data.total', 650)
            ->assertJsonPath('data.customer_note', 'التسليم بعد الساعة 5')
            ->assertJsonPath('data.customer.full_name', 'منى أحمد')
            ->assertJsonPath('data.events.0.actor', 'vendor');

        $this->assertSame(3, $this->variant->fresh()->stock);
        $customer = $this->vendor->store->customers()->sole();
        $this->assertSame('01012345678', $customer->phone);
        $this->assertNotNull($customer->last_order_at);
        Notification::assertNothingSentTo($this->vendor, OrderPlacedNotification::class);
    }

    public function test_reuses_the_customer_with_the_same_phone_and_can_confirm_right_away(): void
    {
        $customer = Customer::factory()->for($this->vendor->store)->create(['phone' => '01012345678', 'full_name' => 'منى']);

        $this->postJson('/api/v1/vendor/orders', $this->payload(['source' => 'messenger', 'confirm' => true]))
            ->assertCreated()
            ->assertJsonPath('data.status', 'confirmed')
            ->assertJsonPath('data.customer.customer_id', $customer->id)
            ->assertJsonPath('data.events.*.status', ['pending', 'confirmed']);

        $this->assertSame(1, $this->vendor->store->customers()->count());
    }

    public function test_the_vendor_sets_the_shipping_fee_and_a_discount(): void
    {
        $this->postJson('/api/v1/vendor/orders', $this->payload(['shipping_fee' => 0, 'discount' => 100]))
            ->assertCreated()
            ->assertJsonPath('data.discount', 100)
            ->assertJsonPath('data.shipping_fee', 0)
            ->assertJsonPath('data.total', 500);

        $this->postJson('/api/v1/vendor/orders', $this->payload(['discount' => 601]))->assertJsonValidationErrors('discount');
    }

    public function test_works_while_the_store_is_closed_and_sells_drafts_but_not_archived_products(): void
    {
        $this->vendor->store->update(['accepting_orders' => false]);
        $this->variant->product->update(['status' => ProductStatus::Draft]);

        $this->postJson('/api/v1/vendor/orders', $this->payload())->assertCreated();

        $this->variant->product->update(['status' => ProductStatus::Archived]);

        $this->postJson('/api/v1/vendor/orders', $this->payload())->assertJsonValidationErrors("items.{$this->variant->id}");
    }

    public function test_rejects_the_storefront_source_missing_stock_and_other_stores_products_and_customers(): void
    {
        $this->postJson('/api/v1/vendor/orders', $this->payload(['source' => 'store']))->assertJsonValidationErrors('source');
        $this->postJson('/api/v1/vendor/orders', $this->payload(['items' => [['variant_id' => $this->variant->id, 'quantity' => 6]]]))->assertJsonValidationErrors("items.{$this->variant->id}");

        $foreignVariant = Product::factory()->create()->variants()->first();
        $this->postJson('/api/v1/vendor/orders', $this->payload(['items' => [['variant_id' => $foreignVariant->id, 'quantity' => 1]]]))->assertJsonValidationErrors("items.{$foreignVariant->id}");
        $this->postJson('/api/v1/vendor/orders', $this->payload(['customer_id' => Customer::factory()->create()->id]))->assertJsonValidationErrors('customer_id');

        $this->assertSame(0, Order::count());
        $this->assertSame(5, $this->variant->fresh()->stock);
    }

    public function test_staff_need_the_create_orders_permission(): void
    {
        $role = StoreRole::factory()->for($this->vendor->store)->allowing(['orders.view', 'orders.update'])->create();
        $staff = $this->vendor->store->staff()->create(['full_name' => 'أحمد سمير', 'phone' => '01077778888', 'email' => 'ahmed@noor.test', 'password' => 'Staff2026pass', 'role_id' => $role->id]);
        Sanctum::actingAs($staff, [Vendor::TOKEN_ABILITY]);

        $this->postJson('/api/v1/vendor/orders', $this->payload())->assertForbidden();

        $role->update(['permissions' => ['orders.view', 'orders.create']]);
        Sanctum::actingAs($staff->fresh(), [Vendor::TOKEN_ABILITY]);

        $this->postJson('/api/v1/vendor/orders', $this->payload())->assertCreated();
    }

    public function test_filters_orders_by_source(): void
    {
        $manual = Order::factory()->for($this->vendor->store)->create(['source' => OrderSource::Whatsapp]);
        Order::factory()->for($this->vendor->store)->create();

        $this->getJson('/api/v1/vendor/orders?source=whatsapp')->assertOk()->assertJsonPath('data.*.order_id', [$manual->id]);
    }
}
