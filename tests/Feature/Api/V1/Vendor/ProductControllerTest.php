<?php

namespace Tests\Feature\Api\V1\Vendor;

use App\Enums\ProductStatus;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Vendor;
use App\Models\Warehouse;
use App\Models\WarehouseStock;
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

    public function test_saves_the_english_name_and_description(): void
    {
        $vendor = $this->actingAsVendor();
        $payload = $this->payload($this->category($vendor), ['name_en' => 'Evening dress', 'description_en' => 'Shiny satin']);

        $productId = $this->postJson('/api/v1/vendor/products', $payload)
            ->assertCreated()
            ->assertJsonPath('data.name', 'فستان سهرة')
            ->assertJsonPath('data.name_en', 'Evening dress')
            ->assertJsonPath('data.description_en', 'Shiny satin')
            ->json('data.product_id');

        $this->getJson('/api/v1/vendor/products?search=evening')->assertOk()->assertJsonPath('data.*.product_id', [$productId]);
    }

    public function test_a_simple_product_has_a_single_variant(): void
    {
        $vendor = $this->actingAsVendor();

        $this->postJson('/api/v1/vendor/products', $this->payload($this->category($vendor), [
            'options' => [],
            'variants' => [['option_values' => [], 'price' => 150, 'stock' => 12]],
        ]))->assertCreated()->assertJsonPath('data.variants.0.title', '')->assertJsonPath('data.stock_total', 12);
    }

    public function test_opening_stock_goes_into_the_chosen_warehouse(): void
    {
        $vendor = $this->actingAsVendor();
        $defaultWarehouse = $vendor->store->defaultWarehouse();
        $branch = Warehouse::factory()->for($vendor->store)->create(['name' => 'فرع الإسكندرية', 'priority' => 2]);

        $response = $this->postJson('/api/v1/vendor/products', $this->payload($this->category($vendor), [
            'warehouse_id' => $branch->id,
            'options' => [],
            'variants' => [['option_values' => [], 'price' => 150, 'stock' => 12]],
        ]))->assertCreated()->assertJsonPath('data.stock_total', 12);

        $variantId = $response->json('data.variants.0.variant_id');
        $stockIn = fn (Warehouse $warehouse): int => (int) WarehouseStock::query()->where(['warehouse_id' => $warehouse->id, 'product_variant_id' => $variantId])->value('stock');

        $this->assertSame(12, $stockIn($branch));
        $this->assertSame(0, $stockIn($defaultWarehouse));
    }

    public function test_opening_stock_goes_into_the_default_warehouse_when_none_is_chosen(): void
    {
        $vendor = $this->actingAsVendor();
        $defaultWarehouse = $vendor->store->defaultWarehouse();

        $response = $this->postJson('/api/v1/vendor/products', $this->payload($this->category($vendor), [
            'options' => [],
            'variants' => [['option_values' => [], 'price' => 150, 'stock' => 7]],
        ]))->assertCreated();

        $variantId = $response->json('data.variants.0.variant_id');

        $this->assertSame(7, (int) WarehouseStock::query()->where(['warehouse_id' => $defaultWarehouse->id, 'product_variant_id' => $variantId])->value('stock'));
    }

    public function test_quantity_changes_on_edit_go_into_the_chosen_warehouse(): void
    {
        $vendor = $this->actingAsVendor();
        $defaultWarehouse = $vendor->store->defaultWarehouse();
        $branch = Warehouse::factory()->for($vendor->store)->create(['name' => 'فرع الإسكندرية', 'priority' => 2]);
        $payload = $this->payload($this->category($vendor), [
            'options' => [],
            'variants' => [['option_values' => [], 'price' => 150, 'stock' => 10]],
        ]);

        $variantId = $this->postJson('/api/v1/vendor/products', $payload)->assertCreated()->json('data.variants.0.variant_id');
        $productId = Product::query()->latest('id')->value('id');

        $this->putJson("/api/v1/vendor/products/{$productId}", [
            ...$payload,
            'warehouse_id' => $branch->id,
            'variants' => [['id' => $variantId, 'option_values' => [], 'price' => 150, 'stock' => 14]],
        ])->assertOk()->assertJsonPath('data.stock_total', 14);

        $stockIn = fn (Warehouse $warehouse): int => (int) WarehouseStock::query()->where(['warehouse_id' => $warehouse->id, 'product_variant_id' => $variantId])->value('stock');

        $this->assertSame(10, $stockIn($defaultWarehouse));
        $this->assertSame(4, $stockIn($branch));
    }

    public function test_sets_the_quantity_of_each_warehouse_on_create_and_edit(): void
    {
        $vendor = $this->actingAsVendor();
        $defaultWarehouse = $vendor->store->defaultWarehouse();
        $branch = Warehouse::factory()->for($vendor->store)->create(['name' => 'فرع الإسكندرية', 'priority' => 2]);
        $payload = $this->payload($this->category($vendor), ['options' => [['name' => 'المقاس', 'values' => ['M', 'L']]]]);
        $variant = fn (string $size, int $main, int $other, ?int $id = null): array => [
            ...($id ? ['id' => $id] : []),
            'option_values' => [$size],
            'price' => 150,
            'stock' => $main + $other,
            'warehouse_stocks' => [
                ['warehouse_id' => $defaultWarehouse->id, 'stock' => $main],
                ['warehouse_id' => $branch->id, 'stock' => $other],
            ],
        ];

        $created = $this->postJson('/api/v1/vendor/products', [...$payload, 'variants' => [$variant('M', 6, 4), $variant('L', 2, 0)]])
            ->assertCreated()
            ->assertJsonPath('data.stock_total', 12)
            ->assertJsonPath('data.variants.0.warehouses', [
                ['warehouse_id' => $defaultWarehouse->id, 'stock' => 6],
                ['warehouse_id' => $branch->id, 'stock' => 4],
            ]);

        [$mediumId, $largeId] = $created->json('data.variants.*.variant_id');
        $productId = $created->json('data.product_id');

        $this->putJson("/api/v1/vendor/products/{$productId}", [...$payload, 'variants' => [$variant('M', 0, 10, $mediumId), $variant('L', 1, 1, $largeId)]])
            ->assertOk()
            ->assertJsonPath('data.stock_total', 12)
            ->assertJsonPath('data.variants.0.warehouses', [
                ['warehouse_id' => $defaultWarehouse->id, 'stock' => 0],
                ['warehouse_id' => $branch->id, 'stock' => 10],
            ])
            ->assertJsonPath('data.variants.1.warehouses', [
                ['warehouse_id' => $defaultWarehouse->id, 'stock' => 1],
                ['warehouse_id' => $branch->id, 'stock' => 1],
            ]);

        $this->getJson("/api/v1/vendor/products/{$productId}")
            ->assertOk()
            ->assertJsonPath('data.variants.0.warehouses.1.stock', 10);
    }

    public function test_a_variant_cannot_list_the_same_warehouse_twice(): void
    {
        $vendor = $this->actingAsVendor();
        $warehouseId = $vendor->store->defaultWarehouse()->id;

        $this->postJson('/api/v1/vendor/products', $this->payload($this->category($vendor), [
            'options' => [],
            'variants' => [['option_values' => [], 'price' => 150, 'stock' => 3, 'warehouse_stocks' => [['warehouse_id' => $warehouseId, 'stock' => 1], ['warehouse_id' => $warehouseId, 'stock' => 2]]]],
        ]))->assertUnprocessable()->assertJsonValidationErrors(['variants.0.warehouse_stocks' => 'لا يمكن تكرار نفس المخزن في كميات التركيبة']);
    }

    public function test_rejects_another_stores_warehouse_in_variant_quantities(): void
    {
        $vendor = $this->actingAsVendor();

        $this->postJson('/api/v1/vendor/products', $this->payload($this->category($vendor), [
            'options' => [],
            'variants' => [['option_values' => [], 'price' => 150, 'stock' => 3, 'warehouse_stocks' => [['warehouse_id' => Warehouse::factory()->create()->id, 'stock' => 3]]]],
        ]))->assertUnprocessable()->assertJsonValidationErrors(['variants.0.warehouse_stocks.0.warehouse_id' => 'المخزن غير موجود']);
    }

    public function test_rejects_another_stores_warehouse(): void
    {
        $vendor = $this->actingAsVendor();

        $this->postJson('/api/v1/vendor/products', $this->payload($this->category($vendor), ['warehouse_id' => Warehouse::factory()->create()->id]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['warehouse_id' => 'المخزن غير موجود']);
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
