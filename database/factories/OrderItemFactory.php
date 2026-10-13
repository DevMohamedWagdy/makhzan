<?php

namespace Database\Factories;

use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<OrderItem>
 */
class OrderItemFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $price = fake()->numberBetween(10, 100) * 10;

        return [
            'order_id' => Order::factory(),
            'product_name' => fake()->words(3, true),
            'unit_price' => $price,
            'quantity' => 1,
            'line_total' => $price,
        ];
    }
}
