<?php

namespace Database\Factories;

use App\Models\Store;
use App\Models\StorePaymentGateway;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<StorePaymentGateway>
 */
class StorePaymentGatewayFactory extends Factory
{
    /**
     * A Paymob test account with cards and wallets set up.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'store_id' => Store::factory(),
            'gateway' => StorePaymentGateway::PAYMOB,
            'credentials' => [
                'secret_key' => 'egy_sk_test_'.fake()->sha1(),
                'public_key' => 'egy_pk_test_'.fake()->lexify('????????????????'),
                'hmac_secret' => fake()->sha1(),
                'card_integration_id' => '4097558',
                'wallet_integration_id' => '4097559',
            ],
            'is_live' => false,
            'verified_at' => now(),
        ];
    }

    public function cardOnly(): static
    {
        return $this->state(fn (array $attributes): array => ['credentials' => [...$attributes['credentials'], 'wallet_integration_id' => null]]);
    }
}
