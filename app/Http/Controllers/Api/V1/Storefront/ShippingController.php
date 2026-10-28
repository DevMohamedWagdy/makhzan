<?php

namespace App\Http\Controllers\Api\V1\Storefront;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Support\Locations;
use Illuminate\Http\JsonResponse;

class ShippingController extends Controller
{
    /**
     * Governorates the store delivers to and their prices, for the checkout page.
     */
    public function __invoke(Store $store): JsonResponse
    {
        $store->load('shippingRates');

        $rates = collect(Locations::activeGovernorateIds())
            ->map(fn (string $governorateId): array => ['governorate_id' => $governorateId, 'price' => $store->shippingFeeFor($governorateId, 0)])
            ->filter(fn (array $rate): bool => $rate['price'] !== null)
            ->values();

        return response()->json([
            'rates' => $rates,
            'free_shipping_threshold' => $store->free_shipping_threshold,
        ]);
    }
}
