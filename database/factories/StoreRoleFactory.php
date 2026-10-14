<?php

namespace Database\Factories;

use App\Models\Store;
use App\Models\StoreRole;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<StoreRole>
 */
class StoreRoleFactory extends Factory
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
            'name' => fake()->unique()->jobTitle(),
            'permissions' => ['orders.view'],
        ];
    }

    /**
     * @param  list<string>  $permissions
     */
    public function allowing(array $permissions): static
    {
        return $this->state(fn (): array => ['permissions' => $permissions]);
    }
}
