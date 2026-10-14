<?php

namespace Database\Factories;

use App\Enums\BillingMethod;
use App\Models\Plan;
use App\Models\Store;
use App\Models\SubscriptionPayment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SubscriptionPayment>
 */
class SubscriptionPaymentFactory extends Factory
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
            'plan_name' => 'Pro',
            'amount' => 299,
            'months' => 1,
            'method' => BillingMethod::Instapay,
            'starts_at' => now(),
            'ends_at' => now()->addMonth(),
        ];
    }
}
