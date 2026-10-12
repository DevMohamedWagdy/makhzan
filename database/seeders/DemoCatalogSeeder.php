<?php

namespace Database\Seeders;

use App\Enums\ProductStatus;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Store;
use Illuminate\Database\Seeder;
use Illuminate\Support\Arr;

/**
 * Categories and products for the demo store (noor-fashion). Local use only.
 */
class DemoCatalogSeeder extends Seeder
{
    /**
     * @var array<string, list<array{0: string, 1: int, 2?: array<string, list<string>>}>>
     */
    private const CATALOG = [
        'فساتين' => [
            ['فستان سهرة ستان', 1450, ['اللون' => ['أسود', 'نبيتي', 'زيتي'], 'المقاس' => ['S', 'M', 'L', 'XL']]],
            ['فستان كاجوال قطن', 690, ['المقاس' => ['S', 'M', 'L']]],
            ['فستان شيفون مشجر', 980, ['اللون' => ['وردي', 'سماوي'], 'المقاس' => ['M', 'L']]],
        ],
        'عبايات' => [
            ['عباية كريب مطرزة', 1250, ['المقاس' => ['52', '54', '56', '58']]],
            ['عباية كتان صيفي', 850, ['اللون' => ['بيج', 'رمادي'], 'المقاس' => ['54', '56']]],
        ],
        'بلوزات وقمصان' => [
            ['بلوزة ساتان بأكمام واسعة', 420, ['اللون' => ['أبيض', 'أسود', 'كحلي'], 'المقاس' => ['S', 'M', 'L']]],
            ['قميص لينن أوفر سايز', 480, ['المقاس' => ['M', 'L', 'XL']]],
        ],
        'إكسسوارات' => [
            ['شنطة يد جلد', 760, ['اللون' => ['بني', 'أسود']]],
            ['طرحة شيفون', 150],
            ['حزام جلد رفيع', 220],
        ],
    ];

    public function run(): void
    {
        $store = Store::query()->firstWhere('slug', 'noor-fashion');

        if (! $store || $store->productCategories()->exists()) {
            return;
        }

        $position = 0;

        foreach (self::CATALOG as $categoryName => $products) {
            $category = $store->productCategories()->create([
                'name' => $categoryName,
                'slug' => ProductCategory::uniqueSlug($store->id, $categoryName),
                'position' => $position++,
            ]);

            foreach ($products as $product) {
                $this->seedProduct($store, $category->id, $product[0], $product[1], $product[2] ?? []);
            }
        }
    }

    /**
     * @param  array<string, list<string>>  $options
     */
    private function seedProduct(Store $store, int $categoryId, string $name, int $price, array $options): void
    {
        $product = $store->products()->create([
            'category_id' => $categoryId,
            'name' => $name,
            'slug' => Product::uniqueSlug($store->id, $name),
            'description' => "{$name} من تشكيلة نور للأزياء الجديدة، خامة ممتازة وتقفيل متقن.",
            'status' => ProductStatus::Active,
            'is_featured' => fake()->boolean(30),
            'options' => collect($options)->map(fn (array $values, string $optionName): array => ['name' => $optionName, 'values' => $values])->values()->all(),
        ]);

        $combinations = Arr::crossJoin(...array_values($options)) ?: [[]];
        $hasDiscount = fake()->boolean(35);

        foreach ($combinations as $index => $values) {
            $product->variants()->create([
                'option_values' => $values,
                'sku' => strtoupper('NF-'.$product->id.'-'.($index + 1)),
                'price' => $price,
                'compare_at_price' => $hasDiscount ? round($price * 1.25, -1) : null,
                'stock' => fake()->randomElement([0, 2, 4, 8, 12, 20, 35]),
                'position' => $index,
            ]);
        }
    }
}
