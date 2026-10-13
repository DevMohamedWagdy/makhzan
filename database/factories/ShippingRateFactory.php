<?php

namespace Database\Factories;

use App\Models\ShippingRate;
use App\Models\Store;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ShippingRate>
 */
class ShippingRateFactory extends Factory
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
            'governorate_id' => 'cairo',
            'price' => 50,
            'is_enabled' => true,
        ];
    }
}
