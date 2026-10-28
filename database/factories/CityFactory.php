<?php

namespace Database\Factories;

use App\Models\City;
use App\Models\Governorate;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<City>
 */
class CityFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->streetName();

        return [
            'id' => str($name)->slug('_')->limit(30, '')->append('_'.fake()->unique()->numberBetween(100, 999))->toString(),
            'governorate_id' => Governorate::factory(),
            'name' => $name,
            'name_en' => $name,
            'sort_order' => 100,
            'is_active' => true,
        ];
    }

    public function inactive(): static
    {
        return $this->state(['is_active' => false]);
    }
}
