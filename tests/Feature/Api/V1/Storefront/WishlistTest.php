<?php

namespace Tests\Feature\Api\V1\Storefront;

use App\Models\Customer;
use App\Models\Product;
use App\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WishlistTest extends TestCase
{
    use RefreshDatabase;

    private const BASE = '/api/v1/storefront/noor-fashion/customer/wishlist';

    private Store $store;

    protected function setUp(): void
    {
        parent::setUp();

        $this->store = Store::factory()->create(['slug' => 'noor-fashion']);
        Sanctum::actingAs(Customer::factory()->for($this->store)->create(), [Customer::TOKEN_ABILITY]);
    }

    public function test_saves_lists_and_removes_products(): void
    {
        [$dress, $bag] = Product::factory()->for($this->store)->count(2)->create();

        $this->postJson(self::BASE, ['product_id' => $dress->id])->assertCreated();
        $this->postJson(self::BASE, ['product_id' => $bag->id])->assertCreated();
        $this->postJson(self::BASE, ['product_id' => $dress->id])->assertCreated();

        $this->getJson(self::BASE)->assertOk()->assertJsonCount(2, 'data')->assertJsonPath('data.0.product_id', $bag->id);

        $this->deleteJson(self::BASE."/{$bag->id}")->assertNoContent();
        $this->getJson(self::BASE)->assertJsonCount(1, 'data')->assertJsonPath('data.0.product_id', $dress->id);
    }

    public function test_hides_products_no_longer_on_sale_and_refuses_other_stores_products(): void
    {
        $draft = Product::factory()->for($this->store)->create();
        $this->postJson(self::BASE, ['product_id' => $draft->id])->assertCreated();
        $draft->update(['status' => 'draft']);

        $this->getJson(self::BASE)->assertJsonCount(0, 'data');
        $this->postJson(self::BASE, ['product_id' => Product::factory()->create()->id])->assertNotFound();
    }

    public function test_needs_a_signed_in_customer(): void
    {
        $this->app['auth']->forgetGuards();

        $this->withHeader('Authorization', '')->getJson(self::BASE)->assertUnauthorized();
    }
}
