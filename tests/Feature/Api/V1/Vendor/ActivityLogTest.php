<?php

namespace Tests\Feature\Api\V1\Vendor;

use App\Models\ActivityLog;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Vendor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ActivityLogTest extends TestCase
{
    use RefreshDatabase;

    private Vendor $vendor;

    protected function setUp(): void
    {
        parent::setUp();

        $this->vendor = $this->actingAsVendor();
    }

    public function test_logs_what_the_team_does_but_not_what_customers_do(): void
    {
        $customer = Customer::factory()->for($this->vendor->store)->create();
        Order::factory()->for($this->vendor->store)->for($customer)->create(['number' => 501]);
        Order::factory()->for($this->vendor->store)->for($customer)->create(['number' => 502]);
        $this->patchJson('/api/v1/vendor/orders/'.Order::query()->firstWhere('number', 501)->id.'/status', ['status' => 'confirmed'])->assertOk();

        Sanctum::actingAs($customer, [Customer::TOKEN_ABILITY]);
        $this->postJson("/api/v1/storefront/{$this->vendor->store->slug}/customer/orders/502/cancel")->assertOk();

        $this->assertSame([['order.status_changed', 'vendor', '#501']], ActivityLog::query()->get()->map(fn (ActivityLog $log): array => [$log->event, $log->actor_type, $log->subject_label])->all());
    }

    public function test_a_new_product_is_one_entry_without_one_per_variant(): void
    {
        $category = ProductCategory::factory()->for($this->vendor->store)->create();

        $this->postJson('/api/v1/vendor/products', ['category_id' => $category->id, 'name' => 'قميص', 'status' => 'active', 'options' => [['name' => 'المقاس', 'values' => ['S', 'M']]], 'variants' => [
            ['option_values' => ['S'], 'price' => 300, 'stock' => 2],
            ['option_values' => ['M'], 'price' => 300, 'stock' => 2],
        ]])->assertCreated();

        $this->assertSame(['product.created'], ActivityLog::query()->where('event', 'like', 'product%')->pluck('event')->all());

        $variant = Product::query()->sole()->variants()->first();
        $variant->update(['price' => 350]);

        $this->assertDatabaseHas('activity_logs', ['event' => 'product_variant.updated', 'subject_id' => $variant->id]);
    }

    public function test_saving_the_shipping_page_is_one_entry_with_what_changed(): void
    {
        $this->putJson('/api/v1/vendor/shipping', [
            'default_shipping_price' => 60,
            'rates' => [
                ['governorate_id' => 'cairo', 'is_enabled' => true, 'price' => 40],
                ['governorate_id' => 'aswan', 'is_enabled' => false, 'price' => null],
                ['governorate_id' => 'giza', 'is_enabled' => true, 'price' => null],
            ],
        ])->assertOk();

        $log = ActivityLog::query()->sole();
        $this->assertSame('store.shipping_updated', $log->event);
        $this->assertEquals(['default_shipping_price' => 60, 'rate:cairo' => 40, 'rate:aswan' => 'off'], $log->changes['new'], 'Giza on the default price is no change.');

        $this->putJson('/api/v1/vendor/shipping', ['default_shipping_price' => 60, 'rates' => [['governorate_id' => 'cairo', 'is_enabled' => true, 'price' => 45]]])->assertOk();

        $this->assertSame(['rate:cairo' => 45], ActivityLog::query()->latest('id')->first()->changes['new']);

        $this->putJson('/api/v1/vendor/shipping', ['default_shipping_price' => 60, 'rates' => [['governorate_id' => 'cairo', 'is_enabled' => true, 'price' => 45]]])->assertOk();

        $this->assertSame(2, ActivityLog::query()->count(), 'Saving without changes adds nothing.');
    }

    public function test_the_store_log_shows_the_teams_actions_and_who_is_in_it(): void
    {
        ActivityLog::query()->create(['store_id' => $this->vendor->store->id, 'actor_type' => 'customer', 'event' => 'order.created']);
        ActivityLog::query()->create(['store_id' => $this->vendor->store->id, 'actor_type' => 'system', 'event' => 'order.status_changed']);
        $this->putJson('/api/v1/vendor/shipping', ['default_shipping_price' => 70, 'rates' => []])->assertOk();

        $this->getJson('/api/v1/vendor/activity')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.event', 'store.shipping_updated')
            ->assertJsonPath('members', [['vendor_id' => $this->vendor->id, 'name' => $this->vendor->full_name]])
            ->assertJsonPath('retention_days', 180);

        $this->getJson("/api/v1/vendor/activity?actor_id={$this->vendor->id}")->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/vendor/activity?actor_id=999')->assertJsonCount(0, 'data');
    }

    public function test_entries_past_the_retention_period_are_pruned(): void
    {
        $old = ActivityLog::query()->create(['store_id' => $this->vendor->store->id, 'actor_type' => 'vendor', 'event' => 'product.updated']);
        $old->forceFill(['created_at' => now()->subDays(181)])->save();
        $recent = ActivityLog::query()->create(['store_id' => $this->vendor->store->id, 'actor_type' => 'vendor', 'event' => 'product.updated']);
        $recent->forceFill(['created_at' => now()->subDays(179)])->save();

        $this->artisan('model:prune', ['--model' => [ActivityLog::class]])->assertSuccessful();

        $this->assertModelMissing($old);
        $this->assertModelExists($recent);
    }
}
