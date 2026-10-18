<?php

namespace Tests\Feature\Api\V1\Vendor;

use App\Enums\OrderStatus;
use App\Models\Customer;
use App\Models\Order;
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
            ->assertJsonPath('settings', ['loyalty_enabled' => true, 'loyalty_earn_rate' => 20, 'loyalty_point_value' => 0.5, 'loyalty_min_redeem' => 50, 'loyalty_tiers' => []])
            ->assertJsonPath('stats.members', 1)
            ->assertJsonPath('stats.outstanding_points', 300)
            ->assertJsonPath('stats.outstanding_value', 150);

        $this->putJson('/api/v1/vendor/loyalty', $this->settings(['loyalty_point_value' => 0]))->assertJsonValidationErrors('loyalty_point_value');
    }

    public function test_sets_up_customer_tiers_lowest_spend_first(): void
    {
        $this->putJson('/api/v1/vendor/loyalty', $this->settings(['loyalty_tiers' => [
            ['name' => ' ذهبي ', 'min_spend' => 15000, 'multiplier' => 1.5],
            ['name' => 'برونزي', 'min_spend' => 0, 'multiplier' => 1],
            ['name' => 'فضي', 'min_spend' => '5000', 'multiplier' => '1.255'],
        ]]))
            ->assertOk()
            ->assertJsonPath('settings.loyalty_tiers', [
                ['name' => 'برونزي', 'min_spend' => 0, 'multiplier' => 1],
                ['name' => 'فضي', 'min_spend' => 5000, 'multiplier' => 1.26],
                ['name' => 'ذهبي', 'min_spend' => 15000, 'multiplier' => 1.5],
            ]);

        $this->putJson('/api/v1/vendor/loyalty', $this->settings())->assertJsonCount(3, 'settings.loyalty_tiers');
        $this->putJson('/api/v1/vendor/loyalty', $this->settings(['loyalty_tiers' => []]))->assertJsonPath('settings.loyalty_tiers', []);
        $this->assertNull($this->vendor->store->fresh()->loyalty_tiers);
    }

    public function test_rejects_invalid_tiers(): void
    {
        $tier = fn (int $minSpend, float $multiplier = 1.5, string $name = 'فضي'): array => ['name' => $name.$minSpend, 'min_spend' => $minSpend, 'multiplier' => $multiplier];

        $this->putJson('/api/v1/vendor/loyalty', $this->settings(['loyalty_tiers' => [$tier(0, 0.5)]]))->assertJsonValidationErrors('loyalty_tiers.0.multiplier');
        $this->putJson('/api/v1/vendor/loyalty', $this->settings(['loyalty_tiers' => [$tier(100), ['name' => 'ذهبي', 'min_spend' => 100, 'multiplier' => 2]]]))->assertJsonValidationErrors(['loyalty_tiers.0.min_spend' => __('validation.distinct', ['attribute' => __('loyalty.tier_min_spend')])]);
        $this->putJson('/api/v1/vendor/loyalty', $this->settings(['loyalty_tiers' => [$tier(0, 1, 'x'), ['name' => 'x0', 'min_spend' => 100, 'multiplier' => 2]]]))->assertJsonValidationErrors('loyalty_tiers.0.name');
        $this->putJson('/api/v1/vendor/loyalty', $this->settings(['loyalty_tiers' => array_map($tier, range(0, 5))]))->assertJsonValidationErrors('loyalty_tiers');
        $this->putJson('/api/v1/vendor/loyalty', $this->settings(['loyalty_tiers' => [['min_spend' => 0, 'multiplier' => 1]]]))->assertJsonValidationErrors('loyalty_tiers.0.name');
    }

    public function test_shows_a_customers_tier_and_progress(): void
    {
        $store = $this->vendor->store;
        $store->forceFill(['loyalty_tiers' => [['name' => 'فضي', 'min_spend' => 1000, 'multiplier' => 1.25], ['name' => 'ذهبي', 'min_spend' => 5000, 'multiplier' => 1.5]]])->save();
        $customer = Customer::factory()->for($store)->create();

        $this->getJson("/api/v1/vendor/customers/{$customer->id}/points")
            ->assertJsonPath('tier.current', null)
            ->assertJsonPath('tier.next.name', 'فضي')
            ->assertJsonPath('tier.remaining', 1000)
            ->assertJsonPath('tier.progress', 0);

        Order::factory()->for($store)->for($customer)->status(OrderStatus::Delivered)->create(['total' => 2000]);

        $this->getJson("/api/v1/vendor/customers/{$customer->id}/points")
            ->assertJsonPath('tier.current.name', 'فضي')
            ->assertJsonPath('tier.current.multiplier', 1.25)
            ->assertJsonPath('tier.next.name', 'ذهبي')
            ->assertJsonPath('tier.progress', 25);
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
