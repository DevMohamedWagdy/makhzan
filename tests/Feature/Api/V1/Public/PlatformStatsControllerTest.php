<?php

namespace Tests\Feature\Api\V1\Public;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\Product;
use App\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlatformStatsControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_active_stores_placed_orders_published_products_and_delivered_sales(): void
    {
        $store = Store::factory()->create();
        Store::factory()->create(['suspended_at' => now()]);

        Order::factory()->for($store)->status(OrderStatus::Delivered)->create(['total' => 1500]);
        Order::factory()->for($store)->status(OrderStatus::Delivered)->create(['total' => 500]);
        Order::factory()->for($store)->status(OrderStatus::Pending)->create(['total' => 900]);
        Order::factory()->for($store)->status(OrderStatus::Cancelled)->create(['total' => 700]);

        Product::factory()->for($store)->count(3)->create();
        Product::factory()->for($store)->draft()->create();

        $this->getJson('/api/v1/platform-stats')
            ->assertOk()
            ->assertExactJson(['data' => ['stores' => 1, 'orders' => 3, 'products' => 3, 'sales' => 2000]]);
    }

    public function test_is_public_and_returns_zeros_on_an_empty_platform(): void
    {
        $this->getJson('/api/v1/platform-stats')
            ->assertOk()
            ->assertExactJson(['data' => ['stores' => 0, 'orders' => 0, 'products' => 0, 'sales' => 0]]);
    }

    public function test_serves_cached_totals_until_the_cache_expires(): void
    {
        Store::factory()->create();
        $this->getJson('/api/v1/platform-stats')->assertJsonPath('data.stores', 1);

        Store::factory()->create();
        $this->getJson('/api/v1/platform-stats')->assertJsonPath('data.stores', 1);

        $this->travel(11)->minutes();
        $this->getJson('/api/v1/platform-stats')->assertJsonPath('data.stores', 2);
    }
}
