<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProductVariant>
 */
class ProductVariantFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'product_id' => Product::factory(),
            'option_values' => [],
            'sku' => null,
            'price' => fake()->numberBetween(15, 120) * 10,
            'compare_at_price' => null,
            'stock' => fake()->numberBetween(0, 40),
            'position' => 0,
        ];
    }
}
