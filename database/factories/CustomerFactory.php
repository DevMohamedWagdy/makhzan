<?php

namespace Database\Factories;

use App\Models\Customer;
use App\Models\Store;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Customer>
 */
class CustomerFactory extends Factory
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
            'full_name' => fake()->name(),
            'phone' => '010'.fake()->unique()->numerify('########'),
            'email' => fake()->unique()->safeEmail(),
            'password' => 'password1',
        ];
    }
}
