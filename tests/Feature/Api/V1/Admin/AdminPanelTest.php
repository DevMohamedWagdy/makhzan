<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Enums\OrderStatus;
use App\Models\Admin;
use App\Models\Order;
use App\Models\Plan;
use App\Models\Store;
use App\Models\Vendor;
use App\Notifications\SubscriptionUpdateNotification;
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
        $this->getJson('/api/v1/vendor/subscription')->assertOk();

        $this->actingAsAdmin();
        $this->postJson("/api/v1/admin/stores/{$store->id}/unsuspend")->assertOk()->assertJsonPath('data.suspended_at', null);
        $this->getJson("/api/v1/storefront/{$store->slug}")->assertOk();
    }

    public function test_activating_a_subscription_records_the_payment_and_extends_renewals(): void
    {
        $this->actingAsAdmin();
        $plan = Plan::factory()->create(['name' => 'Pro']);
        $store = Store::factory()->create();
        $payload = ['plan_id' => $plan->id, 'months' => 1, 'amount' => 299, 'method' => 'instapay', 'reference' => 'IP-1'];

        $this->postJson("/api/v1/admin/stores/{$store->id}/subscription", $payload)->assertOk()->assertJsonPath('data.billing.plan.name', 'Pro')->assertJsonPath('data.billing.status', 'active');
        $firstExpiry = $store->fresh()->plan_expires_at;
        $this->assertTrue($firstExpiry->between(now()->addMonth()->subMinute(), now()->addMonth()->addMinute()));

        $this->postJson("/api/v1/admin/stores/{$store->id}/subscription", $payload)->assertOk();

        $this->assertTrue($store->fresh()->plan_expires_at->equalTo($firstExpiry->copy()->addMonthNoOverflow()));
        $this->assertDatabaseCount('subscription_payments', 2);
        $this->assertDatabaseHas('subscription_payments', ['store_id' => $store->id, 'recorded_by' => $this->admin->id, 'plan_name' => 'Pro']);
        Notification::assertSentToTimes($store->vendor, SubscriptionUpdateNotification::class, 2);
    }

    public function test_manages_plans(): void
    {
        $this->actingAsAdmin();
        $payload = ['name' => 'Starter', 'price_monthly' => 149, 'max_products' => 50, 'max_staff' => 1, 'features' => ['affiliates'], 'is_active' => true];

        $planId = $this->postJson('/api/v1/admin/plans', $payload)->assertCreated()->assertJsonPath('data.slug', 'starter')->json('data.plan_id');

        $this->putJson("/api/v1/admin/plans/{$planId}", [...$payload, 'max_products' => 80])->assertOk()->assertJsonPath('data.max_products', 80);

        Store::factory()->subscribed(Plan::find($planId))->create();
        $this->deleteJson("/api/v1/admin/plans/{$planId}")->assertJsonValidationErrors('plan');

        $unused = Plan::factory()->create();
        $this->deleteJson("/api/v1/admin/plans/{$unused->id}")->assertNoContent();
    }

    public function test_extends_a_stores_trial(): void
    {
        $this->actingAsAdmin();
        $store = Store::factory()->trialEnded()->create();

        $this->postJson("/api/v1/admin/stores/{$store->id}/trial", ['days' => 7])->assertOk()->assertJsonPath('data.billing.status', 'trial')->assertJsonPath('data.billing.days_left', 7);
    }

    public function test_overview_counts_stores_billing_and_requests(): void
    {
        $this->actingAsAdmin();
        $plan = Plan::factory()->create();
        Store::factory()->create(['plan_id' => $plan->id, 'plan_expires_at' => now()->addDays(3)]);
        Store::factory()->create(['suspended_at' => now()]);
        Store::factory()->trialEnded()->create();

        $this->getJson('/api/v1/admin/overview')
            ->assertOk()
            ->assertJsonPath('data.stores.total', 3)
            ->assertJsonPath('data.stores.on_trial', 1)
            ->assertJsonPath('data.stores.paying', 1)
            ->assertJsonPath('data.stores.expiring_7_days', 1)
            ->assertJsonPath('data.stores.suspended', 1);
    }

    public function test_create_admin_command_creates_and_resets_admins(): void
    {
        $this->artisan('makhzan:create-admin', ['--email' => 'New@makhzan.app', '--name' => 'New Admin', '--password' => 'secret-pass-1'])->assertSuccessful();
        $this->assertDatabaseHas('admins', ['email' => 'new@makhzan.app']);

        $this->artisan('makhzan:create-admin', ['--email' => 'bad', '--name' => 'X', '--password' => 'short'])->assertFailed();
    }
}
