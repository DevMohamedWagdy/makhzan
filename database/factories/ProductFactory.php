<?php

namespace Database\Factories;

use App\Enums\ProductStatus;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Store;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Arr;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'store_id' => Store::factory(),
            'category_id' => fn (array $attributes) => ProductCategory::factory()->create(['store_id' => $attributes['store_id']])->id,
            'name' => fake()->words(3, true),
            'slug' => fake()->unique()->slug(3),
            'description' => fake()->sentence(),
            'status' => ProductStatus::Active,
            'is_featured' => false,
            'options' => [],
        ];
    }

    public function draft(): static
    {
        return $this->state(fn (): array => ['status' => ProductStatus::Draft]);
    }

    /**
     * Options such as ['المقاس' => ['S', 'M'], 'اللون' => ['أحمر']]; one variant per combination.
     *
     * @param  array<string, list<string>>  $options
     */
    public function withOptions(array $options): static
    {
        return $this->state(fn (): array => [
            'options' => collect($options)->map(fn (array $values, string $name): array => ['name' => $name, 'values' => $values])->values()->all(),
        ]);
    }

    /**
     * Creates the variants the product's options imply (a single one for simple products),
     * as the product form does.
     */
    public function configure(): static
    {
        return $this->afterCreating(function (Product $product): void {
            if ($product->variants()->exists()) {
                return;
            }

            $combinations = Arr::crossJoin(...array_column($product->options ?: [], 'values')) ?: [[]];
            $price = fake()->numberBetween(15, 120) * 10;

            foreach ($combinations as $position => $values) {
                $product->variants()->create([
                    'option_values' => $values,
                    'price' => $price,
                    'stock' => fake()->numberBetween(0, 40),
                    'position' => $position,
                ]);
            }
        });
    }
}
