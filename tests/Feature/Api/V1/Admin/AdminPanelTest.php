<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Enums\OrderStatus;
use App\Models\Admin;
use App\Models\Order;
use App\Models\Store;
use App\Models\Vendor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminPanelTest extends TestCase
{
    use RefreshDatabase;

    private Admin $admin;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
        $this->admin = Admin::factory()->create(['email' => 'ops@makhzan.app']);
    }

    private function actingAsAdmin(): void
    {
        Sanctum::actingAs($this->admin, [Admin::TOKEN_ABILITY]);
    }

    public function test_admins_sign_in_with_email_and_password(): void
    {
        $this->postJson('/api/v1/admin/auth/login', ['email' => 'OPS@makhzan.app', 'password' => 'password1234'])
            ->assertOk()
            ->assertJsonPath('admin.email', 'ops@makhzan.app')
            ->assertJsonStructure(['token']);

        $this->postJson('/api/v1/admin/auth/login', ['email' => 'ops@makhzan.app', 'password' => 'wrong'])->assertJsonValidationErrors('email');
    }

    public function test_vendor_tokens_cannot_reach_the_admin_panel(): void
    {
        $this->actingAsVendor();

        $this->getJson('/api/v1/admin/stores')->assertForbidden();
    }

    public function test_lists_and_searches_stores_with_owner_and_activity(): void
    {
        $this->actingAsAdmin();
        $store = Store::factory()->create(['name' => 'نور للأزياء']);
        Order::factory()->for($store)->status(OrderStatus::Delivered)->create(['total' => 500]);
        Store::factory()->create(['name' => 'متجر آخر']);

        $this->getJson('/api/v1/admin/stores?search='.urlencode('نور'))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.store_id', $store->id)
            ->assertJsonPath('data.0.owner.email', $store->vendor->email)
            ->assertJsonPath('data.0.orders_count', 1)
            ->assertJsonPath('data.0.delivered_sales', 500);

        $this->getJson('/api/v1/admin/stores?search='.urlencode($store->vendor->email))->assertJsonPath('data.*.store_id', [$store->id]);
    }

    public function test_suspending_closes_the_storefront_and_dashboard_until_unsuspended(): void
    {
        $this->actingAsAdmin();
        $vendor = Vendor::factory()->withStore()->create();
        $store = $vendor->store;
        $vendor->issueToken(remember: true);

        $this->postJson("/api/v1/admin/stores/{$store->id}/suspend", ['reason' => 'مخالفة الشروط'])
            ->assertOk()
            ->assertJsonPath('data.suspension_reason', 'مخالفة الشروط');

        $this->assertSame(0, $vendor->tokens()->count());
        $this->getJson("/api/v1/storefront/{$store->slug}")->assertForbidden();

        Sanctum::actingAs($vendor->fresh(), [Vendor::TOKEN_ABILITY]);
        $this->getJson('/api/v1/vendor/orders')->assertForbidden();

        $this->actingAsAdmin();
        $this->postJson("/api/v1/admin/stores/{$store->id}/unsuspend")->assertOk()->assertJsonPath('data.suspended_at', null);
        $this->getJson("/api/v1/storefront/{$store->slug}")->assertOk();
    }

    public function test_overview_counts_stores(): void
    {
        $this->actingAsAdmin();
        Store::factory()->create();
        Store::factory()->create(['suspended_at' => now()]);

        $this->getJson('/api/v1/admin/overview')
            ->assertOk()
            ->assertJsonPath('data.stores.total', 2)
            ->assertJsonPath('data.stores.suspended', 1)
            ->assertJsonMissingPath('data.billing');
    }

    public function test_create_admin_command_creates_and_resets_admins(): void
    {
        $this->artisan('makhzan:create-admin', ['--email' => 'New@makhzan.app', '--name' => 'New Admin', '--password' => 'secret-pass-1'])->assertSuccessful();
        $this->assertDatabaseHas('admins', ['email' => 'new@makhzan.app']);

        $this->artisan('makhzan:create-admin', ['--email' => 'bad', '--name' => 'X', '--password' => 'short'])->assertFailed();
    }
}
