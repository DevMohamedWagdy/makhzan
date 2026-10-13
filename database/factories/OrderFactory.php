<?php

namespace Database\Factories;

use App\Enums\CommissionStatus;
use App\Enums\OrderStatus;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Store;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Order>
 */
class OrderFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $subtotal = fake()->numberBetween(2, 30) * 50;

        return [
            'store_id' => Store::factory(),
            'customer_id' => fn (array $attributes) => Customer::factory()->create(['store_id' => $attributes['store_id']])->id,
            'number' => fake()->unique()->numberBetween(1001, 99999),
            'status' => OrderStatus::Pending,
            'subtotal' => $subtotal,
            'shipping_fee' => 50,
            'total' => $subtotal + 50,
            'recipient_name' => fake()->name(),
            'phone' => '010'.fake()->numerify('########'),
            'governorate_id' => 'cairo',
            'city_id' => 'nasr_city',
            'address_line' => fake()->streetAddress(),
            'commission_status' => CommissionStatus::None,
        ];
    }

    public function status(OrderStatus $status): static
    {
        return $this->state(fn (): array => ['status' => $status]);
    }
}
