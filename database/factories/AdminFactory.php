<?php

namespace Database\Factories;

use App\Models\Admin;
use App\Models\AdminRole;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends Factory<Admin>
 */
class AdminFactory extends Factory
{
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'full_name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'password' => static::$password ??= Hash::make('password1234'),
            'is_super' => true,
        ];
    }

    /**
     * A team member limited to a role's permissions.
     *
     * @param  list<string>  $permissions
     */
    public function withPermissions(array $permissions): static
    {
        return $this->state(fn (): array => ['is_super' => false, 'role_id' => AdminRole::factory()->allowing($permissions)]);
    }
}
