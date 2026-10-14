<?php

namespace Database\Factories;

use App\Models\AdminRole;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AdminRole>
 */
class AdminRoleFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->jobTitle(),
            'permissions' => ['overview.view'],
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
