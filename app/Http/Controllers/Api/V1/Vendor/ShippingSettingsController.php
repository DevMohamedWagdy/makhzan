<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Vendor\UpdateShippingSettingsRequest;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ShippingSettingsController extends Controller
{
    /**
     * The store's shipping settings with a row for every governorate.
     */
    public function show(Request $request): JsonResponse
    {
        return $this->settings($request->user()->store);
    }

    /**
     * Saves the default price, free-shipping threshold and per-governorate overrides.
     */
    public function update(UpdateShippingSettingsRequest $request): JsonResponse
    {
        $store = $request->user()->store;

        DB::transaction(function () use ($store, $request): void {
            $store->forceFill($request->safe()->only(['default_shipping_price', 'free_shipping_threshold']))->save();

            foreach ($request->validated('rates') as $rate) {
                $store->shippingRates()->updateOrCreate(
                    ['governorate_id' => $rate['governorate_id']],
                    ['is_enabled' => $rate['is_enabled'], 'price' => $rate['price'] ?? null],
                );
            }
        });

        return $this->settings($store->refresh());
    }

    private function settings(Store $store): JsonResponse
    {
        $rates = $store->shippingRates()->get()->keyBy('governorate_id');

        return response()->json([
            'default_shipping_price' => $store->default_shipping_price,
            'free_shipping_threshold' => $store->free_shipping_threshold,
            'rates' => collect(array_keys(config('makhzan.governorates')))->map(fn (string $governorateId): array => [
                'governorate_id' => $governorateId,
                'is_enabled' => $rates[$governorateId]->is_enabled ?? true,
                'price' => $rates[$governorateId]->price ?? null,
            ]),
        ]);
    }
}
