<?php

namespace Tests\Feature\Api\V1\Vendor;

use App\Models\Order;
use App\Models\Product;
use App\Models\StoreRole;
use App\Models\Vendor;
use App\Notifications\OrderCancelledByCustomerNotification;
use App\Notifications\OrderPlacedNotification;
use App\Notifications\StockAlertNotification;
use App\Notifications\StoreAlertNotification;
use App\Support\StorePermissions;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StaffTest extends TestCase
{
    use RefreshDatabase;

    private Vendor $owner;

    protected function setUp(): void
    {
        parent::setUp();

        $this->owner = Vendor::factory()->withStore()->create();
    }

    /**
     * @param  list<string>  $permissions
     */
    private function role(array $permissions): StoreRole
    {
        return StoreRole::factory()->for($this->owner->store)->allowing($permissions)->create();
    }

    /**
     * @param  list<string>  $permissions
     */
    private function staff(array $permissions = [], array $attributes = []): Vendor
    {
        return $this->owner->store->staff()->create([
            'full_name' => 'أحمد سمير',
            'job_title' => 'مسؤول الطلبات',
            'phone' => '01077778888',
            'email' => 'ahmed@noor.test',
            'password' => 'Staff2026pass',
            'role_id' => $this->role($permissions)->id,
            ...$attributes,
        ]);
    }

    private function actingAsStaff(array $permissions): Vendor
    {
        $staff = $this->staff($permissions);
        Sanctum::actingAs($staff, [Vendor::TOKEN_ABILITY]);

        return $staff;
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(StoreRole $role, array $overrides = []): array
    {
        return [
            'full_name' => 'أحمد سمير',
            'job_title' => 'مسؤول الطلبات',
            'phone' => '010 7777 8888',
            'email' => 'Ahmed@Noor.test',
            'password' => 'Staff2026pass',
            'role_id' => $role->id,
            ...$overrides,
        ];
    }

    public function test_the_owner_manages_roles_with_granular_permissions(): void
    {
        $this->actingAsVendor($this->owner);

        $roleId = $this->postJson('/api/v1/vendor/roles', ['name' => 'خدمة العملاء', 'permissions' => ['orders.update', 'customers.view']])
            ->assertCreated()
            ->assertJsonPath('data.permissions', ['orders.view', 'orders.update', 'customers.view'])
            ->json('data.role_id');

        $this->getJson('/api/v1/vendor/roles')->assertOk()->assertJsonPath('data.0.role_id', $roleId)->assertJsonPath('catalog.orders', ['view', 'create', 'update']);
        $this->postJson('/api/v1/vendor/roles', ['name' => 'خدمة العملاء', 'permissions' => []])->assertJsonValidationErrors('name');
        $this->postJson('/api/v1/vendor/roles', ['name' => 'مدير', 'permissions' => ['orders.fly']])->assertJsonValidationErrors('permissions.0');

        $this->putJson("/api/v1/vendor/roles/{$roleId}", ['name' => 'خدمة العملاء', 'permissions' => ['orders.view']])->assertOk()->assertJsonPath('data.permissions', ['orders.view']);

        $this->postJson('/api/v1/vendor/staff', $this->payload(StoreRole::find($roleId)))->assertCreated();
        $this->deleteJson("/api/v1/vendor/roles/{$roleId}")->assertJsonValidationErrors('role');
    }

    public function test_the_owner_adds_lists_edits_and_removes_staff(): void
    {
        $this->actingAsVendor($this->owner);
        $role = $this->role(['orders.view']);

        $staffId = $this->postJson('/api/v1/vendor/staff', $this->payload($role))
            ->assertCreated()
            ->assertJsonPath('data.phone', '01077778888')
            ->assertJsonPath('data.email', 'ahmed@noor.test')
            ->assertJsonPath('data.role.name', $role->name)
            ->assertJsonPath('data.permissions', ['orders.view'])
            ->json('data.staff_id');

        $this->getJson('/api/v1/vendor/staff')->assertOk()->assertJsonPath('data.*.staff_id', [$staffId]);

        $other = $this->role(['products.view']);
        $this->putJson("/api/v1/vendor/staff/{$staffId}", $this->payload($other, ['password' => null]))->assertOk()->assertJsonPath('data.permissions', ['products.view']);

        $this->deleteJson("/api/v1/vendor/staff/{$staffId}")->assertNoContent();
        $this->assertNull(Vendor::find($staffId));
    }

    public function test_staff_need_a_job_title(): void
    {
        $this->actingAsVendor($this->owner);
        $role = $this->role(['orders.view']);

        $staffId = $this->postJson('/api/v1/vendor/staff', $this->payload($role, ['job_title' => 'مسؤول المخزن']))
            ->assertCreated()
            ->assertJsonPath('data.job_title', 'مسؤول المخزن')
            ->json('data.staff_id');

        $this->putJson("/api/v1/vendor/staff/{$staffId}", $this->payload($role, ['password' => null, 'job_title' => 'خدمة العملاء']))
            ->assertOk()
            ->assertJsonPath('data.job_title', 'خدمة العملاء');

        $this->putJson("/api/v1/vendor/staff/{$staffId}", $this->payload($role, ['password' => null, 'job_title' => '']))
            ->assertJsonValidationErrors(['job_title' => 'أدخل وظيفة الموظف']);

        $this->putJson("/api/v1/vendor/staff/{$staffId}", $this->payload($role, ['password' => null, 'job_title' => str_repeat('أ', 101)]))
            ->assertJsonValidationErrors(['job_title' => 'المسمى الوظيفي يجب ألا يزيد عن 100 حرف']);
    }

    public function test_staff_roles_must_belong_to_the_store(): void
    {
        $this->actingAsVendor($this->owner);
        $foreignRole = StoreRole::factory()->create();

        $this->postJson('/api/v1/vendor/staff', $this->payload($foreignRole))->assertJsonValidationErrors('role_id');
        $this->postJson('/api/v1/vendor/staff', $this->payload($this->role([]), ['email' => $this->owner->email]))->assertJsonValidationErrors('email');
    }

    public function test_staff_sign_in_and_see_their_store_role_and_permissions(): void
    {
        $this->staff(['orders.view']);

        $this->postJson('/api/v1/vendor/auth/login', ['identifier' => '01077778888', 'password' => 'Staff2026pass'])
            ->assertOk()
            ->assertJsonPath('vendor.role', 'staff')
            ->assertJsonPath('vendor.permissions', ['orders.view'])
            ->assertJsonPath('vendor.store.store_id', $this->owner->store->id);
    }

    public function test_owners_hold_every_permission(): void
    {
        $this->actingAsVendor($this->owner);

        $this->getJson('/api/v1/vendor/auth/me')->assertJsonPath('data.role', 'owner')->assertJsonPath('data.permissions', StorePermissions::all());
    }

    public function test_view_only_staff_can_read_but_not_change(): void
    {
        $order = Order::factory()->for($this->owner->store)->create();
        $product = Product::factory()->for($this->owner->store)->create();
        $this->actingAsStaff(['orders.view', 'products.view']);

        $this->getJson('/api/v1/vendor/orders')->assertOk()->assertJsonPath('data.*.order_id', [$order->id]);
        $this->patchJson("/api/v1/vendor/orders/{$order->id}/status", ['status' => 'confirmed'])->assertForbidden();
        $this->getJson("/api/v1/vendor/products/{$product->id}")->assertOk();
        $this->deleteJson("/api/v1/vendor/products/{$product->id}")->assertForbidden();
        $this->postJson('/api/v1/vendor/products', [])->assertForbidden();
    }

    public function test_each_action_needs_its_own_permission(): void
    {
        $order = Order::factory()->for($this->owner->store)->create();
        $product = Product::factory()->for($this->owner->store)->create();
        $this->actingAsStaff(['orders.view', 'orders.update', 'products.view', 'products.delete']);

        $this->patchJson("/api/v1/vendor/orders/{$order->id}/status", ['status' => 'confirmed'])->assertOk();
        $this->postJson("/api/v1/vendor/orders/{$order->id}/refunds", ['amount' => 10])->assertForbidden();
        $this->deleteJson("/api/v1/vendor/products/{$product->id}")->assertNoContent();
        $this->getJson('/api/v1/vendor/reports')->assertForbidden();
        $this->getJson('/api/v1/vendor/staff')->assertForbidden();
        $this->getJson('/api/v1/vendor/roles')->assertForbidden();
    }

    public function test_inventory_viewers_list_warehouses_but_only_managers_change_them(): void
    {
        $this->actingAsStaff(['inventory.view']);

        $this->getJson('/api/v1/vendor/warehouses')->assertOk();
        $this->postJson('/api/v1/vendor/warehouses', ['name' => 'مخزن ٢'])->assertForbidden();
    }

    public function test_staff_see_only_the_notifications_of_sections_they_can_open(): void
    {
        $order = Order::factory()->for($this->owner->store)->create();
        $this->owner->notify(new OrderPlacedNotification($order));
        $this->owner->notify(new StockAlertNotification(Product::factory()->for($this->owner->store)->create()->variants()->first(), 0, 5));
        $this->owner->notify(new StoreAlertNotification(StoreAlertNotification::STORE_REACTIVATED));
        $this->actingAsStaff(['notifications.view', 'orders.view']);

        $this->getJson('/api/v1/vendor/notifications')
            ->assertOk()
            ->assertJsonPath('data.*.type', ['order_placed'])
            ->assertJsonPath('summary.unread_count', 1);

        $this->postJson('/api/v1/vendor/notifications/read-all')->assertNoContent();
        $this->assertSame(2, $this->owner->unreadNotifications()->count());

        $stockAlert = $this->owner->notifications()->where('type', 'stock_out')->first();
        $this->postJson("/api/v1/vendor/notifications/{$stockAlert->id}/read")->assertNotFound();
    }

    public function test_staff_who_see_orders_are_told_when_a_customer_cancels(): void
    {
        $order = Order::factory()->for($this->owner->store)->create(['number' => 3001, 'recipient_name' => 'منى', 'total' => 450, 'cancel_reason' => 'طلبت بالخطأ']);
        $this->owner->notify(new OrderCancelledByCustomerNotification($order));
        $this->actingAsStaff(['notifications.view', 'orders.view']);

        $this->getJson('/api/v1/vendor/notifications')
            ->assertOk()
            ->assertJsonPath('data.0.type', 'order_cancelled')
            ->assertJsonPath('data.0.message', 'ألغى منى الطلب #3001 (450.00 ج.م)، السبب: طلبت بالخطأ')
            ->assertJsonPath('data.0.details.order_id', $order->id);
    }

    public function test_staff_without_the_notifications_permission_have_no_bell(): void
    {
        $this->actingAsStaff(['orders.view']);

        $this->getJson('/api/v1/vendor/notifications')->assertForbidden();
    }

    public function test_the_owner_sees_every_notification(): void
    {
        $this->owner->notify(new OrderPlacedNotification(Order::factory()->for($this->owner->store)->create()));
        $this->owner->notify(new StoreAlertNotification(StoreAlertNotification::STORE_REACTIVATED));
        $this->actingAsVendor($this->owner);

        $this->getJson('/api/v1/vendor/notifications')->assertOk()->assertJsonPath('summary.unread_count', 2);
    }

    public function test_each_catalog_feature_has_its_own_permission(): void
    {
        $this->actingAsStaff(['products.view', 'products.update']);

        $this->getJson('/api/v1/vendor/product-categories')->assertOk();
        $this->postJson('/api/v1/vendor/product-categories', ['name' => 'جديد'])->assertForbidden();
        $this->getJson('/api/v1/vendor/collections')->assertForbidden();
        $this->getJson('/api/v1/vendor/warehouses')->assertOk();
        $this->postJson('/api/v1/vendor/warehouses', ['name' => 'فرع'])->assertForbidden();
        $this->getJson('/api/v1/vendor/suppliers')->assertForbidden();
    }

    public function test_lists_other_features_pick_from_are_open_to_those_features(): void
    {
        $this->actingAsStaff(['coupons.view', 'coupons.create']);

        $this->getJson('/api/v1/vendor/products')->assertOk();
        $this->getJson('/api/v1/vendor/product-categories')->assertOk();
        $this->getJson('/api/v1/vendor/affiliates')->assertOk();
        $this->getJson('/api/v1/vendor/products/summary')->assertForbidden();
        $this->getJson('/api/v1/vendor/loyalty')->assertForbidden();
        $this->getJson('/api/v1/vendor/payouts')->assertForbidden();
    }

    public function test_manual_orders_can_pick_products_without_the_inventory_permission(): void
    {
        $this->actingAsStaff(['orders.view', 'orders.create']);

        $this->getJson('/api/v1/vendor/inventory')->assertOk();
        $this->getJson('/api/v1/vendor/inventory/summary')->assertForbidden();
    }

    public function test_the_activity_log_can_be_shared_with_staff(): void
    {
        $staff = $this->actingAsStaff(['orders.view']);
        $this->getJson('/api/v1/vendor/activity')->assertForbidden();

        $staff->role->update(['permissions' => ['activity.view']]);
        $this->getJson('/api/v1/vendor/activity')->assertOk();
    }

    public function test_roles_saved_with_the_old_permissions_are_upgraded_per_feature(): void
    {
        $this->assertEqualsCanonicalizing(
            ['products.view', 'categories.view', 'collections.view', 'affiliates.view', 'payouts.view', 'coupons.view', 'loyalty.view', 'payouts.update', 'shipping.update', 'settings.update', 'warehouses.view', 'warehouses.create', 'warehouses.update', 'warehouses.delete', 'orders.view'],
            StorePermissions::upgrade(['products.view', 'marketing.view', 'marketing.payouts', 'settings.update', 'inventory.warehouses', 'orders.view', 'marketing.unknown']),
        );
    }

    public function test_deactivating_signs_staff_out_and_blocks_sign_in(): void
    {
        $staff = $this->staff(['orders.view']);
        $staff->issueToken(remember: true);
        $this->actingAsVendor($this->owner);

        $this->putJson("/api/v1/vendor/staff/{$staff->id}", $this->payload($staff->role, ['is_active' => false]))->assertOk()->assertJsonPath('data.is_active', false);

        $this->assertSame(0, $staff->tokens()->count());
        $this->postJson('/api/v1/vendor/auth/login', ['identifier' => 'ahmed@noor.test', 'password' => 'Staff2026pass'])->assertJsonValidationErrors('identifier');
    }

    public function test_owners_cannot_manage_another_stores_staff_or_roles(): void
    {
        $staff = $this->staff();
        $this->actingAsVendor();

        $this->putJson("/api/v1/vendor/staff/{$staff->id}", $this->payload($staff->role))->assertNotFound();
        $this->deleteJson("/api/v1/vendor/staff/{$staff->id}")->assertNotFound();
        $this->deleteJson("/api/v1/vendor/roles/{$staff->role_id}")->assertNotFound();
        $this->getJson('/api/v1/vendor/staff')->assertOk()->assertJsonCount(0, 'data');
    }
}
