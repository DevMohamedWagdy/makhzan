<?php

namespace Database\Factories;

use App\Models\Plan;
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

    /**
     * Past its trial without a subscription: must choose a plan.
     */
    public function trialEnded(): static
    {
        return $this->state(fn (): array => ['trial_ends_at' => now()->subDay()]);
    }

    /**
     * On a paid plan for the next month.
     */
    public function subscribed(?Plan $plan = null): static
    {
        return $this->state(fn (): array => ['plan_id' => $plan?->id ?? Plan::factory(), 'plan_expires_at' => now()->addMonth(), 'trial_ends_at' => now()->subDay()]);
    }
}
