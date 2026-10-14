<?php

namespace Database\Factories;

use App\Enums\LoyaltyTransactionType;
use App\Models\Customer;
use App\Models\LoyaltyTransaction;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LoyaltyTransaction>
 */
class LoyaltyTransactionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'customer_id' => Customer::factory(),
            'store_id' => fn (array $attributes): int => Customer::query()->findOrFail($attributes['customer_id'])->store_id,
            'type' => LoyaltyTransactionType::Adjusted,
            'points' => 100,
            'balance_after' => 100,
            'actor' => 'vendor',
        ];
    }
}
