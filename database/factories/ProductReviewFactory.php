<?php

namespace Database\Factories;

use App\Enums\ReviewStatus;
use App\Models\Product;
use App\Models\ProductReview;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProductReview>
 */
class ProductReviewFactory extends Factory
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
            'store_id' => fn (array $attributes): int => Product::query()->findOrFail($attributes['product_id'])->store_id,
            'customer_name' => fake()->name(),
            'rating' => fake()->numberBetween(1, 5),
            'body' => fake()->sentence(),
            'status' => ReviewStatus::Pending,
        ];
    }

    public function approved(): static
    {
        return $this->state(['status' => ReviewStatus::Approved]);
    }
}
