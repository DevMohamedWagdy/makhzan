<?php

namespace Tests\Feature\Api\V1\Vendor;

use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProductImageControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_uploads_images_after_the_existing_ones(): void
    {
        Storage::fake('public');
        $vendor = $this->actingAsVendor();
        $product = Product::factory()->for($vendor->store)->create();
        $existing = ProductImage::factory()->for($product)->create(['position' => 3]);

        $this->post("/api/v1/vendor/products/{$product->id}/images", [
            'images' => [UploadedFile::fake()->image('a.jpg'), UploadedFile::fake()->image('b.png')],
        ], ['Accept' => 'application/json'])->assertOk()->assertJsonCount(3, 'data')->assertJsonPath('data.0.image_id', $existing->id);

        $product->images()->whereKeyNot($existing->id)->each(fn (ProductImage $image) => Storage::disk('public')->assertExists($image->path));
    }

    public function test_limits_the_number_of_images(): void
    {
        Storage::fake('public');
        $vendor = $this->actingAsVendor();
        $product = Product::factory()->for($vendor->store)->create();
        ProductImage::factory()->count(9)->for($product)->create();

        $this->post("/api/v1/vendor/products/{$product->id}/images", [
            'images' => [UploadedFile::fake()->image('a.jpg'), UploadedFile::fake()->image('b.jpg')],
        ], ['Accept' => 'application/json'])->assertUnprocessable()->assertJsonValidationErrors(['images' => 'الحد الأقصى 10 صور للمنتج']);
    }

    public function test_reorders_images(): void
    {
        $vendor = $this->actingAsVendor();
        $product = Product::factory()->for($vendor->store)->create();
        [$first, $second] = ProductImage::factory()->count(2)->for($product)->sequence(['position' => 0], ['position' => 1])->create();

        $this->putJson("/api/v1/vendor/products/{$product->id}/images/order", ['image_ids' => [$second->id, $first->id]])
            ->assertOk()
            ->assertJsonPath('data.*.image_id', [$second->id, $first->id]);
    }

    public function test_deletes_an_image_and_its_file(): void
    {
        Storage::fake('public');
        $vendor = $this->actingAsVendor();
        $product = Product::factory()->for($vendor->store)->create();
        $image = ProductImage::factory()->for($product)->create(['path' => UploadedFile::fake()->image('a.jpg')->store('stores/1/products', 'public')]);

        $this->deleteJson("/api/v1/vendor/products/{$product->id}/images/{$image->id}")->assertNoContent();

        $this->assertModelMissing($image);
        Storage::disk('public')->assertMissing($image->path);
    }

    public function test_cannot_touch_another_stores_product_images(): void
    {
        $this->actingAsVendor();
        $foreign = ProductImage::factory()->create();

        $this->deleteJson("/api/v1/vendor/products/{$foreign->product_id}/images/{$foreign->id}")->assertNotFound();
        $this->assertModelExists($foreign);
    }
}
