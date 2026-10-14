<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Models\ActivityLog;
use App\Models\Admin;
use App\Models\AdminRole;
use App\Models\Order;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Store;
use App\Models\Vendor;
use App\Notifications\AdminAlertNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminTeamAndLogsTest extends TestCase
{
    use RefreshDatabase;

    private Admin $super;

    protected function setUp(): void
    {
        parent::setUp();

        $this->super = Admin::factory()->create(['email' => 'boss@makhzan.app']);
    }

    private function actingAsAdmin(?Admin $admin = null): Admin
    {
        $admin ??= $this->super;
        Sanctum::actingAs($admin, [Admin::TOKEN_ABILITY]);

        return $admin;
    }

    public function test_admins_only_reach_what_their_role_allows(): void
    {
        $this->actingAsAdmin(Admin::factory()->withPermissions(['stores.view'])->create());
        $store = Store::factory()->create();

        $this->getJson('/api/v1/admin/stores')->assertOk();
        $this->getJson("/api/v1/admin/stores/{$store->id}")->assertOk();
        $this->postJson("/api/v1/admin/stores/{$store->id}/suspend", ['reason' => 'x'])->assertForbidden();
        $this->getJson('/api/v1/admin/overview')->assertForbidden();
        $this->getJson('/api/v1/admin/team')->assertForbidden();
        $this->getJson('/api/v1/admin/auth/me')->assertJsonPath('data.permissions', ['stores.view'])->assertJsonPath('data.is_super', false);
    }

    public function test_manages_team_members_and_roles(): void
    {
        $this->actingAsAdmin();

        $roleId = $this->postJson('/api/v1/admin/roles', ['name' => 'دعم فني', 'permissions' => ['stores.suspend', 'logs.view']])
            ->assertCreated()
            ->assertJsonPath('data.permissions', ['stores.view', 'stores.suspend', 'logs.view'])
            ->json('data.role_id');

        $memberId = $this->postJson('/api/v1/admin/team', ['full_name' => 'سارة', 'email' => 'Sara@Makhzan.app', 'password' => 'secret-pass-1', 'role_id' => $roleId])
            ->assertCreated()
            ->assertJsonPath('data.email', 'sara@makhzan.app')
            ->assertJsonPath('data.role.name', 'دعم فني')
            ->json('data.admin_id');

        $this->postJson('/api/v1/admin/auth/login', ['email' => 'sara@makhzan.app', 'password' => 'secret-pass-1'])->assertOk()->assertJsonPath('admin.permissions', ['stores.view', 'stores.suspend', 'logs.view']);

        $this->actingAsAdmin();
        $this->deleteJson("/api/v1/admin/roles/{$roleId}")->assertJsonValidationErrors('role');
        $this->putJson("/api/v1/admin/team/{$memberId}", ['full_name' => 'سارة', 'email' => 'sara@makhzan.app', 'role_id' => $roleId, 'is_active' => false])->assertOk()->assertJsonPath('data.is_active', false);
        $this->postJson('/api/v1/admin/auth/login', ['email' => 'sara@makhzan.app', 'password' => 'secret-pass-1'])->assertJsonValidationErrors('email');
    }

    public function test_nobody_can_lock_the_team_out(): void
    {
        $this->actingAsAdmin();

        $this->putJson("/api/v1/admin/team/{$this->super->id}", ['full_name' => 'Boss', 'email' => 'boss@makhzan.app', 'is_super' => true, 'is_active' => false])->assertJsonValidationErrors('is_active');
        $this->deleteJson("/api/v1/admin/team/{$this->super->id}")->assertJsonValidationErrors('admin');
    }

    public function test_actions_are_logged_with_who_did_them_and_what_changed(): void
    {
        $vendor = $this->actingAsVendor();
        $product = Product::factory()->for($vendor->store)->create(['name' => 'فستان']);
        $this->putJson("/api/v1/vendor/products/{$product->id}", [
            'category_id' => $product->category_id, 'name' => 'فستان سهرة', 'status' => 'active', 'options' => [],
            'variants' => [['option_values' => [], 'price' => 100, 'stock' => 1]],
        ])->assertOk();

        $log = ActivityLog::query()->where('event', 'product.updated')->latest('id')->first();
        $this->assertSame('vendor', $log->actor_type);
        $this->assertSame($vendor->id, $log->actor_id);
        $this->assertSame($vendor->store->id, $log->store_id);
        $this->assertSame('فستان', $log->changes['old']['name']);
        $this->assertSame('فستان سهرة', $log->changes['new']['name']);

        $this->actingAsAdmin();
        $this->getJson('/api/v1/admin/logs?event=product.updated&store_id='.$vendor->store->id)
            ->assertOk()
            ->assertJsonPath('data.0.event', 'product.updated')
            ->assertJsonPath('data.0.actor.name', $vendor->full_name);
    }

    public function test_store_owners_see_their_stores_activity_but_not_admin_actions(): void
    {
        $vendor = $this->actingAsVendor();
        $this->actingAsAdmin();
        $this->postJson("/api/v1/admin/stores/{$vendor->store->id}/suspend", ['reason' => 'مراجعة'])->assertOk();
        $this->postJson("/api/v1/admin/stores/{$vendor->store->id}/unsuspend")->assertOk();
        $this->assertDatabaseHas('activity_logs', ['event' => 'store.suspended', 'actor_type' => 'admin']);

        $this->actingAsVendor($vendor->fresh());
        Order::factory()->for($vendor->store)->create();

        $events = collect($this->getJson('/api/v1/vendor/activity')->assertOk()->json('data'))->pluck('event');
        $this->assertContains('order.created', $events);
        $this->assertNotContains('store.suspended', $events);
    }

    public function test_admins_are_alerted_about_new_stores_and_subscription_requests(): void
    {
        $limited = Admin::factory()->withPermissions(['orders.view'])->create();

        $this->postJson('/api/v1/vendor/auth/register', [
            'vendor' => ['full_name' => 'محمد علي حسن', 'phone' => '01011112222', 'email' => 'new@shop.test', 'password' => 'Shop2026pass', 'password_confirmation' => 'Shop2026pass'],
            'store' => ['name' => 'متجر جديد', 'slug' => 'new-shop', 'governorate_id' => 'cairo', 'city_id' => 'nasr_city'],
        ])->assertCreated();

        $this->assertSame(1, $this->super->notifications()->where('type', AdminAlertNotification::STORE_REGISTERED)->count());
        $this->assertSame(0, $limited->notifications()->count());

        $vendor = Vendor::query()->firstWhere('email', 'new@shop.test');
        $this->actingAsVendor($vendor);
        $plan = Plan::factory()->create(['name' => 'Pro']);
        $this->postJson('/api/v1/vendor/subscription/requests', ['plan_id' => $plan->id, 'months' => 1, 'method' => 'instapay', 'reference' => 'IP-9'])->assertCreated();

        $this->actingAsAdmin();
        $types = $this->getJson('/api/v1/admin/notifications')->assertOk()->assertJsonPath('summary.unread_count', 2)->json('data.*.type');
        $this->assertEqualsCanonicalizing([AdminAlertNotification::STORE_REGISTERED, AdminAlertNotification::SUBSCRIPTION_REQUESTED], $types);
        $this->postJson('/api/v1/admin/notifications/read-all')->assertNoContent();
        $this->assertSame(0, $this->super->unreadNotifications()->count());
    }

    public function test_admins_browse_orders_and_accounts_and_control_stores(): void
    {
        $this->actingAsAdmin();
        $owner = Vendor::factory()->withStore()->create();
        $order = Order::factory()->for($owner->store)->create(['number' => 4321]);
        Order::factory()->create();

        $this->getJson('/api/v1/admin/orders?store_id='.$owner->store->id)->assertOk()->assertJsonPath('data.*.order_id', [$order->id]);
        $this->getJson("/api/v1/admin/orders/{$order->id}")->assertOk()->assertJsonPath('data.number', 4321)->assertJsonPath('store.store_id', $owner->store->id);
        $this->getJson('/api/v1/admin/vendors?type=owner&search='.urlencode($owner->email))->assertOk()->assertJsonPath('data.0.store.store_id', $owner->store->id);

        $this->patchJson("/api/v1/admin/vendors/{$owner->id}", ['password' => 'NewPass2026', 'is_active' => true])->assertOk();
        $this->postJson('/api/v1/vendor/auth/login', ['identifier' => $owner->email, 'password' => 'NewPass2026'])->assertOk();

        $this->actingAsAdmin();
        $this->patchJson("/api/v1/admin/stores/{$owner->store->id}", ['accepting_orders' => false])->assertOk()->assertJsonPath('data.accepting_orders', false);
        $this->postJson("/api/v1/admin/stores/{$owner->store->id}/impersonate")->assertOk()->assertJsonPath('vendor.vendor_id', $owner->id)->assertJsonStructure(['token']);
        $this->assertDatabaseHas('activity_logs', ['event' => 'store.impersonated', 'actor_type' => 'admin', 'store_id' => $owner->store->id]);
    }

    public function test_the_overview_has_daily_series_and_attention_lists(): void
    {
        $this->actingAsAdmin();
        Store::factory()->create(['trial_ends_at' => now()->addDays(2)]);

        $this->getJson('/api/v1/admin/overview')
            ->assertOk()
            ->assertJsonCount(30, 'data.daily')
            ->assertJsonCount(12, 'data.monthly_revenue')
            ->assertJsonPath('data.daily.29.stores', 1)
            ->assertJsonCount(1, 'data.trials_ending')
            ->assertJsonCount(1, 'data.latest_stores');
    }

    public function test_admin_roles_validate_permissions(): void
    {
        $this->actingAsAdmin();
        AdminRole::factory()->create(['name' => 'مالية']);

        $this->postJson('/api/v1/admin/roles', ['name' => 'مالية', 'permissions' => ['stores.fly']])->assertJsonValidationErrors(['name', 'permissions.0']);
        $this->getJson('/api/v1/admin/roles')->assertOk()->assertJsonPath('catalog.subscriptions', ['view', 'manage']);
    }
}
