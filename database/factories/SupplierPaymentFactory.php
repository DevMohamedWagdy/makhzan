<?php

namespace Database\Factories;

use App\Models\Supplier;
use App\Models\SupplierPayment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SupplierPayment>
 */
class SupplierPaymentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'supplier_id' => Supplier::factory(),
            'store_id' => fn (array $attributes): int => Supplier::query()->withoutGlobalScopes()->findOrFail($attributes['supplier_id'])->store_id,
            'amount' => fake()->randomFloat(2, 100, 5000),
            'paid_at' => now()->toDateString(),
            'method' => 'cash',
        ];
    }
}
