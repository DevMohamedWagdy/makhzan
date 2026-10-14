<?php

namespace Database\Factories;

use App\Models\Store;
use App\Models\StoreShippingAccount;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<StoreShippingAccount>
 */
class StoreShippingAccountFactory extends Factory
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
            'carrier' => StoreShippingAccount::BOSTA,
            'credentials' => ['api_key' => 'bosta_test_key', 'webhook_secret' => 'bosta-webhook-secret'],
            'settings' => ['allow_open_package' => true],
            'verified_at' => now(),
        ];
    }
}
