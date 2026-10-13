<?php

namespace Database\Factories;

use App\Enums\StockMovementType;
use App\Models\ProductVariant;
use App\Models\StockMovement;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<StockMovement>
 */
class StockMovementFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'product_variant_id' => ProductVariant::factory(),
            'store_id' => fn (array $attributes) => ProductVariant::find($attributes['product_variant_id'])->product->store_id,
            'product_id' => fn (array $attributes) => ProductVariant::find($attributes['product_variant_id'])->product_id,
            'product_name' => fn (array $attributes) => ProductVariant::find($attributes['product_variant_id'])->product->name,
            'type' => StockMovementType::Restock,
            'quantity' => 10,
            'stock_before' => 0,
            'stock_after' => 10,
            'actor' => StockMovement::ACTOR_VENDOR,
        ];
    }
}
