<?php

namespace Database\Factories;

use App\Models\Store;
use App\Models\Vendor;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Store>
 */
class StoreFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'vendor_id' => Vendor::factory(),
            'name' => fake()->company(),
            'slug' => fake()->unique()->slug(2),
            'logo_path' => null,
            'governorate_id' => 'cairo',
            'city_id' => 'nasr_city',
        ];
    }
}
