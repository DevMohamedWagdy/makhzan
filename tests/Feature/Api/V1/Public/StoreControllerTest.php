<?php

namespace Tests\Feature\Api\V1\Public;

use App\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StoreControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_public_store_identity_by_slug(): void
    {
        $store = Store::factory()->create(['name' => 'نور للأزياء', 'slug' => 'noor-fashion']);

        $this->getJson('/api/v1/stores/noor-fashion')
            ->assertOk()
            ->assertExactJson(['data' => ['name' => 'نور للأزياء', 'slug' => 'noor-fashion', 'logo_url' => null]]);
    }

    public function test_returns_404_for_unknown_slug(): void
    {
        $this->getJson('/api/v1/stores/no-such-store')->assertNotFound()->assertJsonPath('message', 'المتجر غير موجود');
    }

    public function test_slug_availability_route_is_not_shadowed_by_store_lookup(): void
    {
        $this->getJson('/api/v1/stores/slug-availability?slug=fresh-store')->assertOk()->assertJsonPath('available', true);
    }
}
