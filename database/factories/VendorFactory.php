<?php

namespace Database\Factories;

use App\Models\Store;
use App\Models\Vendor;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<Vendor>
 */
class VendorFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
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
            'phone' => '010'.fake()->unique()->numerify('########'),
            'email' => fake()->unique()->safeEmail(),
            'password' => static::$password ??= Hash::make('password1'),
            'remember_token' => Str::random(10),
        ];
    }

    /**
     * Vendors own exactly one store; sign-up always creates both.
     */
    public function withStore(): static
    {
        return $this->has(Store::factory());
    }
}
