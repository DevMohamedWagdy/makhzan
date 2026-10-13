<?php

namespace Database\Factories;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Order;
use App\Models\Payment;
use App\Models\StorePaymentGateway;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Payment>
 */
class PaymentFactory extends Factory
{
    /**
     * A pending card payment for an order (use ->for($order)).
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'order_id' => Order::factory(),
            'store_id' => fn (array $attributes) => Order::query()->find($attributes['order_id'])->store_id,
            'gateway' => StorePaymentGateway::PAYMOB,
            'method' => PaymentMethod::Card,
            'status' => PaymentStatus::Pending,
            'amount' => fn (array $attributes) => Order::query()->find($attributes['order_id'])->total,
            'reference' => (string) Str::ulid(),
            'gateway_intention_id' => 'pi_test_'.fake()->lexify('????????'),
            'gateway_order_id' => (string) fake()->unique()->numberBetween(100000000, 999999999),
        ];
    }

    public function paid(): static
    {
        return $this->state(fn (): array => [
            'status' => PaymentStatus::Paid,
            'gateway_transaction_id' => (string) fake()->unique()->numberBetween(100000000, 999999999),
            'paid_at' => now(),
        ]);
    }
}
