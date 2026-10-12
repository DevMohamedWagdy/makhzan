<?php

namespace Tests\Feature\Api\V1\Vendor;

use App\Models\Product;
use App\Models\ProductCategory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProductCategoryControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_lists_the_stores_categories_in_order_with_product_counts(): void
    {
        $vendor = $this->actingAsVendor();
        $second = ProductCategory::factory()->for($vendor->store)->create(['position' => 2]);
        $first = ProductCategory::factory()->for($vendor->store)->create(['position' => 1]);
        Product::factory()->count(2)->for($vendor->store)->create(['category_id' => $first->id]);
        ProductCategory::factory()->create();

        $this->getJson('/api/v1/vendor/product-categories')
            ->assertOk()
            ->assertJsonPath('data.*.category_id', [$first->id, $second->id])
            ->assertJsonPath('data.0.products_count', 2);
    }

    public function test_creates_a_category_at_the_end_with_an_image(): void
    {
        Storage::fake('public');
        $vendor = $this->actingAsVendor();
        ProductCategory::factory()->for($vendor->store)->create(['position' => 4]);

        $response = $this->post('/api/v1/vendor/product-categories', [
            'name' => 'عبايات',
            'description' => 'عبايات كريب وكتان',
            'image' => UploadedFile::fake()->image('cover.jpg'),
        ], ['Accept' => 'application/json']);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'عبايات')
            ->assertJsonPath('data.slug', 'aabayat')
            ->assertJsonPath('data.position', 5)
            ->assertJsonPath('data.products_count', 0);

        Storage::disk('public')->assertExists(ProductCategory::find($response->json('data.category_id'))->image_path);
    }

    public function test_category_names_are_unique_per_store(): void
    {
        $vendor = $this->actingAsVendor();
        ProductCategory::factory()->for($vendor->store)->create(['name' => 'فساتين']);
        ProductCategory::factory()->create(['name' => 'عبايات']);

        $this->postJson('/api/v1/vendor/product-categories', ['name' => 'فساتين'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name' => 'يوجد قسم بنفس الاسم بالفعل']);
        $this->postJson('/api/v1/vendor/product-categories', ['name' => 'عبايات'])->assertCreated();
    }

    public function test_updates_a_category(): void
    {
        $vendor = $this->actingAsVendor();
        $category = ProductCategory::factory()->for($vendor->store)->create(['name' => 'قديم']);

        $this->putJson("/api/v1/vendor/product-categories/{$category->id}", ['name' => 'جديد', 'is_active' => false])
            ->assertOk()
            ->assertJsonPath('data.name', 'جديد')
            ->assertJsonPath('data.is_active', false);
    }

    public function test_cannot_delete_a_category_that_has_products(): void
    {
        $vendor = $this->actingAsVendor();
        $category = ProductCategory::factory()->for($vendor->store)->create();
        Product::factory()->for($vendor->store)->create(['category_id' => $category->id])->delete();

        $this->deleteJson("/api/v1/vendor/product-categories/{$category->id}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['category' => 'لا يمكن حذف قسم به منتجات، انقل منتجاته لقسم آخر أولاً']);
    }

    public function test_deletes_an_empty_category(): void
    {
        $vendor = $this->actingAsVendor();
        $category = ProductCategory::factory()->for($vendor->store)->create();

        $this->deleteJson("/api/v1/vendor/product-categories/{$category->id}")->assertNoContent();
        $this->assertModelMissing($category);
    }

    public function test_returns_404_for_another_stores_category(): void
    {
        $this->actingAsVendor();
        $foreign = ProductCategory::factory()->create();

        $this->putJson("/api/v1/vendor/product-categories/{$foreign->id}", ['name' => 'x'])->assertNotFound();
        $this->deleteJson("/api/v1/vendor/product-categories/{$foreign->id}")->assertNotFound();
        $this->assertModelExists($foreign);
    }
}
