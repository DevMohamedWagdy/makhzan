<?php

namespace Tests\Feature\Api\V1\Vendor;

use App\Enums\PlanFeature;
use App\Models\Admin;
use App\Models\Plan;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Store;
use App\Models\StoreRole;
use App\Models\SubscriptionRequest;
use App\Models\Vendor;
use App\Notifications\SubscriptionUpdateNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SubscriptionTest extends TestCase
{
    use RefreshDatabase;

    private Vendor $vendor;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
        config(['makhzan.billing.accounts' => ['vodafone_cash' => '01000000000', 'instapay' => null, 'bank_transfer' => null]]);
        $this->vendor = $this->actingAsVendor();
    }

    public function test_shows_the_trial_usage_plans_and_where_to_pay(): void
    {
        Plan::factory()->create(['name' => 'Pro']);
        Product::factory()->for($this->vendor->store)->count(2)->create();

        $this->getJson('/api/v1/vendor/subscription')
            ->assertOk()
            ->assertJsonPath('data.billing.status', 'trial')
            ->assertJsonPath('data.billing.days_left', 14)
            ->assertJsonPath('data.plan', null)
            ->assertJsonPath('data.usage.products', 2)
            ->assertJsonCount(1, 'data.plans')
            ->assertJsonPath('data.payment_accounts', [['method' => 'vodafone_cash', 'label' => 'فودافون كاش', 'account' => '01000000000']]);
    }

    public function test_a_new_store_gets_a_full_featured_trial(): void
    {
        Plan::factory()->create(['features' => [], 'max_products' => 0]);
        $store = $this->vendor->store;

        $this->assertTrue($store->trial_ends_at->between(now()->addDays(14)->subMinute(), now()->addDays(14)->addMinute()));
        $this->assertTrue($store->hasFeature(PlanFeature::Affiliates));
        $this->assertTrue($store->canAddProduct());
        $this->assertTrue($store->takesOrders());
    }

    public function test_after_the_trial_only_the_subscription_page_and_no_new_orders(): void
    {
        Plan::factory()->create();
        $this->vendor->store->forceFill(['trial_ends_at' => now()->subMinute()])->save();
        $this->actingAsVendor($this->vendor->fresh());

        $this->getJson('/api/v1/vendor/orders')->assertStatus(402);
        $this->getJson('/api/v1/vendor/subscription')->assertOk()->assertJsonPath('data.billing.status', 'expired');
        $this->getJson("/api/v1/storefront/{$this->vendor->store->slug}")->assertOk()->assertJsonPath('store.accepting_orders', false);
        $this->assertFalse($this->vendor->store->fresh()->takesOrders());
    }

    public function test_requests_a_plan_once_until_reviewed(): void
    {
        $plan = Plan::factory()->create(['price_monthly' => 299, 'price_yearly' => 2990]);
        $payload = ['plan_id' => $plan->id, 'months' => 12, 'method' => 'vodafone_cash', 'reference' => '0101 TRX 55'];

        $this->postJson('/api/v1/vendor/subscription/requests', $payload)
            ->assertCreated()
            ->assertJsonPath('data.amount', 2990)
            ->assertJsonPath('data.status', 'pending');

        $this->postJson('/api/v1/vendor/subscription/requests', $payload)->assertJsonValidationErrors('plan_id');
        $this->getJson('/api/v1/vendor/subscription')->assertJsonPath('data.pending_request.months', 12);
    }

    public function test_staff_cannot_see_or_change_the_subscription(): void
    {
        $role = StoreRole::factory()->for($this->vendor->store)->allowing(['settings.view', 'settings.update'])->create();
        Sanctum::actingAs($this->vendor->store->staff()->create(['full_name' => 'Staff', 'phone' => '01055554444', 'email' => 's@x.test', 'password' => 'Staff2026pass', 'role_id' => $role->id]), [Vendor::TOKEN_ABILITY]);

        $this->getJson('/api/v1/vendor/subscription')->assertForbidden();
    }

    public function test_an_admin_approves_or_rejects_a_request(): void
    {
        $admin = Admin::factory()->create();
        $plan = Plan::factory()->create(['name' => 'Pro']);
        $approved = SubscriptionRequest::factory()->for($this->vendor->store)->for($plan)->create(['months' => 3, 'amount' => 897]);
        $rejected = SubscriptionRequest::factory()->for($this->vendor->store)->for($plan)->create();
        Sanctum::actingAs($admin, [Admin::TOKEN_ABILITY]);

        $this->postJson("/api/v1/admin/subscription-requests/{$approved->id}/approve")->assertOk()->assertJsonPath('data.status', 'approved');
        $this->postJson("/api/v1/admin/subscription-requests/{$approved->id}/approve")->assertJsonValidationErrors('status');
        $this->postJson("/api/v1/admin/subscription-requests/{$rejected->id}/reject", ['note' => 'لم يصل التحويل'])->assertOk()->assertJsonPath('data.status', 'rejected');

        $store = $this->vendor->store->fresh();
        $this->assertSame($plan->id, $store->plan_id);
        $this->assertTrue($store->plan_expires_at->isAfter(now()->addMonths(3)->subMinute()));
        $this->assertDatabaseHas('subscription_payments', ['store_id' => $store->id, 'amount' => 897, 'months' => 3]);
        Notification::assertSentTo($this->vendor, SubscriptionUpdateNotification::class, fn (SubscriptionUpdateNotification $notification): bool => $notification->event === SubscriptionUpdateNotification::REJECTED && $notification->note === 'لم يصل التحويل');
    }

    public function test_a_paid_plans_limits_and_features_apply(): void
    {
        $plan = Plan::factory()->create(['max_products' => 1, 'max_staff' => 0, 'features' => []]);
        $this->vendor->store->forceFill(['plan_id' => $plan->id, 'plan_expires_at' => now()->addMonth()])->save();
        $this->actingAsVendor($this->vendor->fresh());
        Product::factory()->for($this->vendor->store)->create();
        $category = ProductCategory::factory()->for($this->vendor->store)->create();

        $this->postJson('/api/v1/vendor/products', ['category_id' => $category->id, 'name' => 'فستان', 'status' => 'active', 'options' => [], 'variants' => [['option_values' => [], 'price' => 100, 'stock' => 1]]])
            ->assertJsonValidationErrors('plan');
        $this->postJson('/api/v1/vendor/staff', ['full_name' => 'Staff One', 'phone' => '01055554444', 'email' => 's@x.test', 'password' => 'Staff2026pass', 'role_id' => StoreRole::factory()->for($this->vendor->store)->create()->id])
            ->assertJsonValidationErrors('plan');
        $this->postJson('/api/v1/vendor/affiliates', [])->assertStatus(402);
        $this->assertFalse($this->vendor->fresh()->store->hasFeature(PlanFeature::OnlinePayments));
    }

    public function test_without_any_plans_nothing_is_limited(): void
    {
        $this->vendor->store->forceFill(['trial_ends_at' => now()->subDay()])->save();

        $this->assertSame('unrestricted', $this->vendor->store->billingStatus());
        $this->assertTrue($this->vendor->store->canAddProduct());
        $this->assertTrue($this->vendor->store->hasFeature(PlanFeature::Affiliates));
    }

    public function test_reminds_owners_before_their_plan_ends(): void
    {
        $plan = Plan::factory()->create();
        $this->vendor->store->forceFill(['plan_id' => $plan->id, 'plan_expires_at' => now()->addDays(3)])->save();

        $trialStore = Store::factory()->create(['trial_ends_at' => now()->addDays(3)]);

        $this->artisan('makhzan:remind-expiring-subscriptions')->assertSuccessful();

        Notification::assertSentTo($this->vendor, SubscriptionUpdateNotification::class, fn (SubscriptionUpdateNotification $notification): bool => $notification->event === SubscriptionUpdateNotification::EXPIRING);
        Notification::assertSentTo($trialStore->vendor, SubscriptionUpdateNotification::class, fn (SubscriptionUpdateNotification $notification): bool => $notification->event === SubscriptionUpdateNotification::TRIAL_ENDING);
    }
}
