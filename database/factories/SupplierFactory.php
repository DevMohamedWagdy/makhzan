<?php

namespace Database\Factories;

use App\Models\Store;
use App\Models\Supplier;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Supplier>
 */
class SupplierFactory extends Factory
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
            'name' => fake()->company(),
            'contact_name' => fake()->name(),
            'phone' => '010'.fake()->numerify('########'),
            'email' => fake()->optional()->safeEmail(),
        ];
    }
}
