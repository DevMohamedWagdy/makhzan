<?php

namespace Database\Factories;

use App\Enums\PurchaseOrderStatus;
use App\Models\PurchaseOrder;
use App\Models\Supplier;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PurchaseOrder>
 */
class PurchaseOrderFactory extends Factory
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
            'store_id' => fn (array $attributes) => Supplier::find($attributes['supplier_id'])->store_id,
            'number' => fake()->unique()->numberBetween(1, 99999),
            'status' => PurchaseOrderStatus::Draft,
        ];
    }

    public function status(PurchaseOrderStatus $status): static
    {
        return $this->state(fn (): array => ['status' => $status]);
    }
}
