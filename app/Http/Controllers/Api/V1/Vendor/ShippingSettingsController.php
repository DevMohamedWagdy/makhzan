<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Vendor\UpdateShippingSettingsRequest;
use App\Models\ShippingRate;
use App\Models\Store;
use App\Support\ActivityLogger;
use App\Support\Locations;
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
        $before = $this->snapshot($store);

        // One log entry for the whole page instead of one per governorate.
        ActivityLogger::withoutLogging(fn () => DB::transaction(function () use ($store, $request): void {
            $store->forceFill($request->safe()->only(['default_shipping_price', 'free_shipping_threshold']))->save();

            foreach ($request->validated('rates') as $rate) {
                $store->shippingRates()->updateOrCreate(
                    ['governorate_id' => $rate['governorate_id']],
                    ['is_enabled' => $rate['is_enabled'], 'price' => $rate['price'] ?? null],
                );
            }
        }));

        $after = $this->snapshot($store->refresh());
        $changed = array_keys(array_filter($after, fn (mixed $value, string $key): bool => ($before[$key] ?? null) !== $value, ARRAY_FILTER_USE_BOTH));

        if ($changed !== []) {
            ActivityLogger::log('store.shipping_updated', $store, [
                'old' => array_intersect_key($before, array_flip($changed)),
                'new' => array_intersect_key($after, array_flip($changed)),
            ]);
        }

        return $this->settings($store);
    }

    /**
     * The page's values, flat: the defaults, then each governorate's price ("off" when there's no delivery).
     *
     * @return array<string, float|string|null>
     */
    private function snapshot(Store $store): array
    {
        $rates = $store->shippingRates()->get()->mapWithKeys(fn (ShippingRate $rate): array => [
            "rate:{$rate->governorate_id}" => $rate->is_enabled ? ($rate->price === null ? null : (float) $rate->price) : 'off',
        ]);

        return [
            'default_shipping_price' => $store->default_shipping_price === null ? null : (float) $store->default_shipping_price,
            'free_shipping_threshold' => $store->free_shipping_threshold === null ? null : (float) $store->free_shipping_threshold,
            ...$rates->all(),
        ];
    }

    private function settings(Store $store): JsonResponse
    {
        $rates = $store->shippingRates()->get()->keyBy('governorate_id');

        return response()->json([
            'default_shipping_price' => $store->default_shipping_price,
            'free_shipping_threshold' => $store->free_shipping_threshold,
            'rates' => collect(Locations::activeGovernorateIds())->map(fn (string $governorateId): array => [
                'governorate_id' => $governorateId,
                'is_enabled' => $rates[$governorateId]->is_enabled ?? true,
                'price' => $rates[$governorateId]->price ?? null,
            ]),
        ]);
    }
}
