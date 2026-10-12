<?php

namespace Tests\Feature\Api\V1\Vendor;

use App\Enums\ProductStatus;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Vendor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductControllerTest extends TestCase
{
    use RefreshDatabase;

    private function category(Vendor $vendor): ProductCategory
    {
        return ProductCategory::factory()->for($vendor->store)->create(['name' => 'فساتين']);
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(ProductCategory $category, array $overrides = []): array
    {
        return [
            'category_id' => $category->id,
            'name' => 'فستان سهرة',
            'description' => 'ستان لامع',
            'status' => 'active',
            'options' => [
                ['name' => 'اللون', 'values' => ['أسود', 'نبيتي']],
                ['name' => 'المقاس', 'values' => ['M', 'L']],
            ],
            'variants' => [
                ['option_values' => ['أسود', 'M'], 'price' => 1450, 'compare_at_price' => 1800, 'sku' => 'DR-BK-M', 'stock' => 5],
                ['option_values' => ['أسود', 'L'], 'price' => 1450, 'sku' => 'DR-BK-L', 'stock' => 0],
                ['option_values' => ['نبيتي', 'M'], 'price' => 1500, 'stock' => 3],
            ],
            ...$overrides,
        ];
    }

    public function test_creates_a_product_with_its_variants(): void
    {
        $vendor = $this->actingAsVendor();
        $category = $this->category($vendor);

        $response = $this->postJson('/api/v1/vendor/products', $this->payload($category))
            ->assertCreated()
            ->assertJsonPath('data.name', 'فستان سهرة')
            ->assertJsonPath('data.slug', 'fstan-shr')
            ->assertJsonPath('data.category.name', 'فساتين')
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('data.price', 1450)
            ->assertJsonPath('data.price_max', 1500)
            ->assertJsonPath('data.compare_at_price', 1800)
            ->assertJsonPath('data.stock_total', 8)
            ->assertJsonCount(3, 'data.variants')
            ->assertJsonPath('data.variants.0.title', 'أسود / M');

        $product = Product::find($response->json('data.product_id'));
        $this->assertTrue($product->store->is($vendor->store));
        $this->assertSame(['أسود', 'L'], $product->variants[1]->option_values);
    }

    public function test_a_simple_product_has_a_single_variant(): void
    {
        $vendor = $this->actingAsVendor();

        $this->postJson('/api/v1/vendor/products', $this->payload($this->category($vendor), [
            'options' => [],
            'variants' => [['option_values' => [], 'price' => 150, 'stock' => 12]],
        ]))->assertCreated()->assertJsonPath('data.variants.0.title', '')->assertJsonPath('data.stock_total', 12);
    }

    public function test_a_category_is_required(): void
    {
        $vendor = $this->actingAsVendor();
        $payload = $this->payload($this->category($vendor));
        unset($payload['category_id']);

        $this->postJson('/api/v1/vendor/products', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['category_id' => 'اختر القسم']);
    }

    public function test_rejects_another_stores_category(): void
    {
        $vendor = $this->actingAsVendor();
        $foreignCategory = ProductCategory::factory()->create();

        $this->postJson('/api/v1/vendor/products', $this->payload($this->category($vendor), ['category_id' => $foreignCategory->id]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['category_id' => 'القسم غير موجود']);
    }

    public function test_variants_must_match_the_options(): void
    {
        $vendor = $this->actingAsVendor();
        $payload = $this->payload($this->category($vendor));
        $payload['variants'][1]['option_values'] = ['أبيض', 'L'];
        $payload['variants'][2]['option_values'] = ['أسود', 'M'];

        $this->postJson('/api/v1/vendor/products', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'variants.1.option_values' => 'هذه التركيبة لا تطابق خيارات المنتج',
                'variants.2.option_values' => 'هذه التركيبة مكررة',
            ]);
    }

    public function test_a_product_without_options_cannot_have_several_variants(): void
    {
        $vendor = $this->actingAsVendor();

        $this->postJson('/api/v1/vendor/products', $this->payload($this->category($vendor), [
            'options' => [],
            'variants' => [['option_values' => [], 'price' => 1, 'stock' => 1], ['option_values' => [], 'price' => 2, 'stock' => 1]],
        ]))->assertUnprocessable()->assertJsonValidationErrors(['variants' => 'المنتج بدون خيارات يجب أن يكون له سعر ومخزون واحد فقط']);
    }

    public function test_rejects_duplicate_option_names_and_values(): void
    {
        $vendor = $this->actingAsVendor();

        $this->postJson('/api/v1/vendor/products', $this->payload($this->category($vendor), [
            'options' => [['name' => 'المقاس', 'values' => ['M', ' M']], ['name' => 'المقاس ', 'values' => ['L']]],
        ]))->assertUnprocessable()->assertJsonValidationErrors(['options' => 'لا يمكن تكرار اسم الخيار', 'options.0.values']);
    }

    public function test_compare_at_price_must_exceed_the_price(): void
    {
        $vendor = $this->actingAsVendor();
        $payload = $this->payload($this->category($vendor));
        $payload['variants'][0]['compare_at_price'] = 1450;

        $this->postJson('/api/v1/vendor/products', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['variants.0.compare_at_price' => 'السعر قبل الخصم يجب أن يكون أكبر من سعر البيع']);
    }

    public function test_skus_are_unique_within_the_store(): void
    {
        $vendor = $this->actingAsVendor();
        $category = $this->category($vendor);
        Product::factory()->for($vendor->store)->create(['category_id' => $category->id])->variants()->first()->update(['sku' => 'DR-BK-M']);
        $payload = $this->payload($category);
        $payload['variants'][2]['sku'] = 'DR-BK-L';

        $this->postJson('/api/v1/vendor/products', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['variants.0.sku' => 'رمز SKU مستخدم لمنتج آخر', 'variants.2.sku' => 'رمز SKU مكرر']);
    }

    public function test_update_syncs_variants(): void
    {
        $vendor = $this->actingAsVendor();
        $category = $this->category($vendor);
        $product = Product::factory()->for($vendor->store)->withOptions(['المقاس' => ['S', 'M', 'L']])->create(['category_id' => $category->id]);
        [$small, $medium] = $product->variants;

        $this->putJson("/api/v1/vendor/products/{$product->id}", $this->payload($category, [
            'name' => 'اسم جديد',
            'options' => [['name' => 'المقاس', 'values' => ['S', 'M', 'XL']]],
            'variants' => [
                ['id' => $small->id, 'option_values' => ['S'], 'price' => 300, 'stock' => 9],
                ['id' => $medium->id, 'option_values' => ['M'], 'price' => 300, 'stock' => 4],
                ['option_values' => ['XL'], 'price' => 350, 'stock' => 2],
            ],
        ]))->assertOk()->assertJsonPath('data.name', 'اسم جديد')->assertJsonPath('data.stock_total', 15);

        $this->assertSame(['S', 'M', 'XL'], $product->variants()->get()->map->title()->all());
        $this->assertSame(9, $small->fresh()->stock);
        $this->assertSame($product->slug, $product->fresh()->slug);
    }

    public function test_update_rejects_variant_ids_of_another_product(): void
    {
        $vendor = $this->actingAsVendor();
        $category = $this->category($vendor);
        $product = Product::factory()->for($vendor->store)->create(['category_id' => $category->id]);
        $otherVariant = Product::factory()->for($vendor->store)->create(['category_id' => $category->id])->variants()->first();

        $this->putJson("/api/v1/vendor/products/{$product->id}", $this->payload($category, [
            'options' => [],
            'variants' => [['id' => $otherVariant->id, 'option_values' => [], 'price' => 100, 'stock' => 1]],
        ]))->assertUnprocessable()->assertJsonValidationErrors(['variants' => 'بعض التركيبات لا تخص هذا المنتج']);
    }

    public function test_lists_and_filters_the_stores_products(): void
    {
        $vendor = $this->actingAsVendor();
        $dresses = $this->category($vendor);
        $bags = ProductCategory::factory()->for($vendor->store)->create();
        $products = Product::factory()->for($vendor->store);
        $dress = $products->create(['category_id' => $dresses->id, 'name' => 'فستان أحمر']);
        $dress->variants()->update(['stock' => 30, 'sku' => 'RED-1']);
        $soldOut = $products->create(['category_id' => $bags->id, 'name' => 'شنطة']);
        $soldOut->variants()->update(['stock' => 0]);
        $lowStock = $products->draft()->create(['category_id' => $bags->id, 'name' => 'محفظة']);
        $lowStock->variants()->update(['stock' => 3]);
        Product::factory()->create();

        $this->getJson('/api/v1/vendor/products')->assertOk()->assertJsonPath('meta.total', 3);
        $this->getJson("/api/v1/vendor/products?category_id={$bags->id}")->assertJsonPath('meta.total', 2);
        $this->getJson('/api/v1/vendor/products?status=draft')->assertJsonPath('data.*.product_id', [$lowStock->id]);
        $this->getJson('/api/v1/vendor/products?stock=out')->assertJsonPath('data.*.product_id', [$soldOut->id]);
        $this->getJson('/api/v1/vendor/products?stock=low')->assertJsonPath('data.*.product_id', [$lowStock->id]);
        $this->getJson('/api/v1/vendor/products?stock=in')->assertJsonPath('data.*.product_id', [$dress->id]);
        $this->getJson('/api/v1/vendor/products?search=RED')->assertJsonPath('data.*.product_id', [$dress->id]);

        $this->getJson('/api/v1/vendor/products/summary')->assertOk()->assertJson([
            'total' => 3, 'active' => 2, 'draft' => 1, 'archived' => 0, 'out_of_stock' => 1, 'low_stock' => 1,
        ]);
    }

    public function test_deleting_soft_deletes_the_product(): void
    {
        $vendor = $this->actingAsVendor();
        $product = Product::factory()->for($vendor->store)->create(['category_id' => $this->category($vendor)->id]);

        $this->deleteJson("/api/v1/vendor/products/{$product->id}")->assertNoContent();

        $this->assertSoftDeleted($product);
        $this->getJson("/api/v1/vendor/products/{$product->id}")->assertNotFound();
    }

    public function test_returns_404_for_another_stores_product(): void
    {
        $vendor = $this->actingAsVendor();
        $foreign = Product::factory()->create(['status' => ProductStatus::Active]);

        $this->getJson("/api/v1/vendor/products/{$foreign->id}")->assertNotFound();
        $this->putJson("/api/v1/vendor/products/{$foreign->id}", $this->payload($this->category($vendor)))->assertNotFound();
        $this->deleteJson("/api/v1/vendor/products/{$foreign->id}")->assertNotFound();
        $this->assertNotSoftDeleted($foreign);
    }
}
