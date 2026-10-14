<?php

namespace Database\Factories;

use App\Enums\PlanFeature;
use App\Models\Plan;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Plan>
 */
class PlanFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = ucfirst(fake()->unique()->word());

        return [
            'name' => $name,
            'slug' => Str::slug($name).'-'.fake()->unique()->numberBetween(1, 99999),
            'price_monthly' => 299,
            'price_yearly' => 2990,
            'max_products' => null,
            'max_staff' => null,
            'features' => PlanFeature::cases(),
            'is_active' => true,
        ];
    }
}
