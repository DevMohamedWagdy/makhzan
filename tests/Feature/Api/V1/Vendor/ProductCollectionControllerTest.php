<?php

namespace Tests\Feature\Api\V1\Vendor;

use App\Models\Product;
use App\Models\ProductCollection;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductCollectionControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_lists_the_stores_collections_in_order_with_product_counts(): void
    {
        $vendor = $this->actingAsVendor();
        $second = ProductCollection::factory()->for($vendor->store)->create(['position' => 2]);
        $first = ProductCollection::factory()->for($vendor->store)->create(['position' => 1]);
        $first->products()->attach(Product::factory()->count(2)->for($vendor->store)->create());
        ProductCollection::factory()->create();

        $this->getJson('/api/v1/vendor/collections')
            ->assertOk()
            ->assertJsonPath('data.*.collection_id', [$first->id, $second->id])
            ->assertJsonPath('data.0.products_count', 2)
            ->assertJsonPath('data.1.products_count', 0);
    }

    public function test_creates_a_collection_at_the_end(): void
    {
        $vendor = $this->actingAsVendor();
        ProductCollection::factory()->for($vendor->store)->create(['position' => 4]);

        $this->postJson('/api/v1/vendor/collections', ['name' => 'أحدث العروض', 'name_en' => 'Latest offers', 'is_active' => false])
            ->assertCreated()
            ->assertJsonPath('data.name', 'أحدث العروض')
            ->assertJsonPath('data.name_en', 'Latest offers')
            ->assertJsonPath('data.position', 5)
            ->assertJsonPath('data.is_active', false)
            ->assertJsonPath('data.products_count', 0);
    }

    public function test_collection_names_are_unique_per_store(): void
    {
        $vendor = $this->actingAsVendor();
        ProductCollection::factory()->for($vendor->store)->create(['name' => 'أحدث المنتجات']);
        ProductCollection::factory()->create(['name' => 'أحدث العروض']);

        $this->postJson('/api/v1/vendor/collections', ['name' => 'أحدث المنتجات'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name' => 'يوجد تصنيف بنفس الاسم بالفعل']);
        $this->postJson('/api/v1/vendor/collections', ['name' => 'أحدث العروض'])->assertCreated();
    }

    public function test_updates_a_collection(): void
    {
        $vendor = $this->actingAsVendor();
        $collection = ProductCollection::factory()->for($vendor->store)->create(['name' => 'قديم']);

        $this->putJson("/api/v1/vendor/collections/{$collection->id}", ['name' => 'جديد', 'is_active' => false])
            ->assertOk()
            ->assertJsonPath('data.name', 'جديد')
            ->assertJsonPath('data.is_active', false);
    }

    public function test_deletes_a_collection_but_keeps_its_products(): void
    {
        $vendor = $this->actingAsVendor();
        $collection = ProductCollection::factory()->for($vendor->store)->create();
        $product = Product::factory()->for($vendor->store)->create();
        $collection->products()->attach($product);

        $this->deleteJson("/api/v1/vendor/collections/{$collection->id}")->assertNoContent();

        $this->assertModelMissing($collection);
        $this->assertModelExists($product);
        $this->assertDatabaseMissing('collection_products', ['collection_id' => $collection->id]);
    }

    public function test_shows_a_collection_with_its_products_in_order(): void
    {
        $vendor = $this->actingAsVendor();
        $collection = ProductCollection::factory()->for($vendor->store)->create();
        [$first, $second] = Product::factory()->count(2)->for($vendor->store)->create();
        $collection->products()->attach([$second->id => ['position' => 2], $first->id => ['position' => 1]]);

        $this->getJson("/api/v1/vendor/collections/{$collection->id}")
            ->assertOk()
            ->assertJsonPath('data.products.*.product_id', [$first->id, $second->id])
            ->assertJsonPath('data.products_count', 2);
    }

    public function test_attaches_products_at_the_end_without_duplicates(): void
    {
        $vendor = $this->actingAsVendor();
        $collection = ProductCollection::factory()->for($vendor->store)->create();
        [$existing, $new] = Product::factory()->count(2)->for($vendor->store)->create();
        $collection->products()->attach($existing, ['position' => 3]);

        $this->postJson("/api/v1/vendor/collections/{$collection->id}/products", ['product_ids' => [$new->id, $existing->id]])
            ->assertOk()
            ->assertJsonPath('data.products.*.product_id', [$existing->id, $new->id])
            ->assertJsonPath('data.products_count', 2);

        $this->assertDatabaseHas('collection_products', ['collection_id' => $collection->id, 'product_id' => $new->id, 'position' => 4]);
    }

    public function test_cannot_attach_another_stores_product(): void
    {
        $vendor = $this->actingAsVendor();
        $collection = ProductCollection::factory()->for($vendor->store)->create();
        $foreignProduct = Product::factory()->create();

        $this->postJson("/api/v1/vendor/collections/{$collection->id}/products", ['product_ids' => [$foreignProduct->id]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['product_ids.0']);
        $this->assertDatabaseCount('collection_products', 0);
    }

    public function test_detaches_a_product(): void
    {
        $vendor = $this->actingAsVendor();
        $collection = ProductCollection::factory()->for($vendor->store)->create();
        [$kept, $removed] = Product::factory()->count(2)->for($vendor->store)->create();
        $collection->products()->attach([$kept->id, $removed->id]);

        $this->deleteJson("/api/v1/vendor/collections/{$collection->id}/products/{$removed->id}")
            ->assertOk()
            ->assertJsonPath('data.products.*.product_id', [$kept->id]);

        $this->assertModelExists($removed);
    }

    public function test_reorders_products(): void
    {
        $vendor = $this->actingAsVendor();
        $collection = ProductCollection::factory()->for($vendor->store)->create();
        [$first, $second, $third] = Product::factory()->count(3)->for($vendor->store)->create();
        $collection->products()->attach([$first->id => ['position' => 0], $second->id => ['position' => 1], $third->id => ['position' => 2]]);

        $this->putJson("/api/v1/vendor/collections/{$collection->id}/products/order", ['product_ids' => [$third->id, $first->id, $second->id]])
            ->assertOk()
            ->assertJsonPath('data.products.*.product_id', [$third->id, $first->id, $second->id]);
    }

    public function test_reorder_rejects_products_outside_the_collection(): void
    {
        $vendor = $this->actingAsVendor();
        $collection = ProductCollection::factory()->for($vendor->store)->create();
        $outside = Product::factory()->for($vendor->store)->create();

        $this->putJson("/api/v1/vendor/collections/{$collection->id}/products/order", ['product_ids' => [$outside->id]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['product_ids.0']);
    }

    public function test_returns_404_for_another_stores_collection(): void
    {
        $vendor = $this->actingAsVendor();
        $foreign = ProductCollection::factory()->create();
        $product = Product::factory()->for($vendor->store)->create();

        $this->getJson("/api/v1/vendor/collections/{$foreign->id}")->assertNotFound();
        $this->putJson("/api/v1/vendor/collections/{$foreign->id}", ['name' => 'x'])->assertNotFound();
        $this->postJson("/api/v1/vendor/collections/{$foreign->id}/products", ['product_ids' => [$product->id]])->assertNotFound();
        $this->putJson("/api/v1/vendor/collections/{$foreign->id}/products/order", ['product_ids' => [$product->id]])->assertNotFound();
        $this->deleteJson("/api/v1/vendor/collections/{$foreign->id}/products/{$product->id}")->assertNotFound();
        $this->deleteJson("/api/v1/vendor/collections/{$foreign->id}")->assertNotFound();
        $this->assertModelExists($foreign);
    }
}
