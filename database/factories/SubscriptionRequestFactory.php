<?php

namespace Database\Factories;

use App\Enums\BillingMethod;
use App\Models\Plan;
use App\Models\Store;
use App\Models\SubscriptionRequest;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SubscriptionRequest>
 */
class SubscriptionRequestFactory extends Factory
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
            'plan_id' => Plan::factory(),
            'months' => 1,
            'amount' => 299,
            'method' => BillingMethod::VodafoneCash,
            'reference' => 'TRX'.fake()->numerify('########'),
        ];
    }
}
