<?php

namespace Tests\Feature\Api\V1\Vendor;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ShippingSettingsControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_lists_every_governorate_and_saves_the_settings(): void
    {
        $vendor = $this->actingAsVendor();

        $this->getJson('/api/v1/vendor/shipping')
            ->assertOk()
            ->assertJsonPath('default_shipping_price', null)
            ->assertJsonCount(count(config('makhzan.governorates')), 'rates');

        $this->putJson('/api/v1/vendor/shipping', [
            'default_shipping_price' => 60,
            'free_shipping_threshold' => 1500,
            'rates' => [
                ['governorate_id' => 'cairo', 'is_enabled' => true, 'price' => 40],
                ['governorate_id' => 'aswan', 'is_enabled' => false, 'price' => null],
            ],
        ])->assertOk()->assertJsonPath('default_shipping_price', 60)->assertJsonFragment(['governorate_id' => 'cairo', 'is_enabled' => true, 'price' => 40]);

        $store = $vendor->store->fresh();
        $this->assertSame(40.0, $store->shippingFeeFor('cairo', 100));
        $this->assertSame(60.0, $store->shippingFeeFor('giza', 100));
        $this->assertNull($store->shippingFeeFor('aswan', 100));
        $this->assertSame(0.0, $store->shippingFeeFor('giza', 1500));
    }

    public function test_rejects_negative_prices_and_unknown_governorates(): void
    {
        $this->actingAsVendor();

        $this->putJson('/api/v1/vendor/shipping', ['default_shipping_price' => -5, 'rates' => [['governorate_id' => 'atlantis', 'is_enabled' => true]]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['default_shipping_price', 'rates.0.governorate_id']);
    }
}
