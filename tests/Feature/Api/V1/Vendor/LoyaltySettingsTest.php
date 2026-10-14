<?php

namespace Tests\Feature\Api\V1\Vendor;

use App\Models\Customer;
use App\Models\Plan;
use App\Models\Store;
use App\Models\StoreRole;
use App\Models\Vendor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LoyaltySettingsTest extends TestCase
{
    use RefreshDatabase;

    private Vendor $vendor;

    protected function setUp(): void
    {
        parent::setUp();

        $this->vendor = $this->actingAsVendor();
    }

    private function settings(array $overrides = []): array
    {
        return ['loyalty_enabled' => true, 'loyalty_earn_rate' => 20, 'loyalty_point_value' => 0.5, 'loyalty_min_redeem' => 50, ...$overrides];
    }

    public function test_sets_up_the_program_and_reports_its_numbers(): void
    {
        Customer::factory()->for($this->vendor->store)->create(['points_balance' => 300]);
        Customer::factory()->for($this->vendor->store)->create(['points_balance' => 0]);
        Customer::factory()->create(['points_balance' => 999]);

        $this->putJson('/api/v1/vendor/loyalty', $this->settings())
            ->assertOk()
            ->assertJsonPath('available', true)
            ->assertJsonPath('settings', ['loyalty_enabled' => true, 'loyalty_earn_rate' => 20, 'loyalty_point_value' => 0.5, 'loyalty_min_redeem' => 50])
            ->assertJsonPath('stats.members', 1)
            ->assertJsonPath('stats.outstanding_points', 300)
            ->assertJsonPath('stats.outstanding_value', 150);

        $this->putJson('/api/v1/vendor/loyalty', $this->settings(['loyalty_point_value' => 0]))->assertJsonValidationErrors('loyalty_point_value');
    }

    public function test_the_program_needs_a_plan_that_includes_it(): void
    {
        $store = Store::factory()->subscribed(Plan::factory()->create(['features' => []]))->create();
        $this->actingAsVendor($store->vendor);

        $this->getJson('/api/v1/vendor/loyalty')->assertJsonPath('available', false);
        $this->putJson('/api/v1/vendor/loyalty', $this->settings())->assertJsonValidationErrors('loyalty_enabled');
        $this->putJson('/api/v1/vendor/loyalty', $this->settings(['loyalty_enabled' => false]))->assertOk();
    }

    public function test_gives_and_takes_points_by_hand_with_a_reason(): void
    {
        $customer = Customer::factory()->for($this->vendor->store)->create(['points_balance' => 40]);

        $this->postJson("/api/v1/vendor/customers/{$customer->id}/points", ['points' => 100, 'note' => 'هدية عيد ميلاد'])
            ->assertCreated()
            ->assertJsonPath('balance', 140)
            ->assertJsonPath('transaction.type', 'adjusted');

        $this->postJson("/api/v1/vendor/customers/{$customer->id}/points", ['points' => -500, 'note' => 'تصحيح'])->assertJsonPath('balance', 0)->assertJsonPath('transaction.points', -140);
        $this->postJson("/api/v1/vendor/customers/{$customer->id}/points", ['points' => 10])->assertJsonValidationErrors(['note' => __('loyalty.adjustment_note_required')]);

        $this->getJson("/api/v1/vendor/customers/{$customer->id}/points")->assertOk()->assertJsonCount(2, 'data')->assertJsonPath('balance', 0);
        $this->getJson("/api/v1/vendor/customers/{$customer->id}")->assertJsonPath('data.points_balance', 0);
    }

    public function test_cannot_touch_another_stores_customers_and_staff_need_marketing_rights(): void
    {
        $foreign = Customer::factory()->create();
        $this->postJson("/api/v1/vendor/customers/{$foreign->id}/points", ['points' => 100, 'note' => 'x'])->assertNotFound();

        $role = StoreRole::factory()->for($this->vendor->store)->allowing(['customers.view'])->create();
        $staff = $this->vendor->store->staff()->create(['full_name' => 'أحمد', 'phone' => '01077778888', 'email' => 'ahmed@noor.test', 'password' => 'Staff2026pass', 'role_id' => $role->id]);
        Sanctum::actingAs($staff, [Vendor::TOKEN_ABILITY]);
        $customer = Customer::factory()->for($this->vendor->store)->create();

        $this->getJson("/api/v1/vendor/customers/{$customer->id}/points")->assertOk();
        $this->postJson("/api/v1/vendor/customers/{$customer->id}/points", ['points' => 100, 'note' => 'x'])->assertForbidden();
        $this->putJson('/api/v1/vendor/loyalty', $this->settings())->assertForbidden();
    }
}
