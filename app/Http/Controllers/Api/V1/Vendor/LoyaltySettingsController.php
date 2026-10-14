<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Enums\LoyaltyTransactionType;
use App\Enums\PlanFeature;
use App\Http\Controllers\Controller;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class LoyaltySettingsController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return response()->json($this->payload($request->user()->store));
    }

    /**
     * The program's rules: points per 100 EGP of delivered products, what a point is worth at
     * checkout and the fewest points a customer can spend. Optional customer tiers (up to five,
     * each from a delivered spend with its own earn-rate multiplier) replace the current ones
     * when sent; an empty list removes them.
     *
     * @throws ValidationException
     */
    public function update(Request $request): JsonResponse
    {
        $store = $request->user()->store;
        $settings = $request->validate([
            'loyalty_enabled' => ['required', 'boolean'],
            'loyalty_earn_rate' => ['required', 'integer', 'min:1', 'max:1000'],
            'loyalty_point_value' => ['required', 'numeric', 'min:0.01', 'max:100'],
            'loyalty_min_redeem' => ['required', 'integer', 'min:1', 'max:1000000'],
            'loyalty_tiers' => ['sometimes', 'array', 'max:5'],
            'loyalty_tiers.*.name' => ['required', 'string', 'max:30', 'distinct'],
            'loyalty_tiers.*.min_spend' => ['required', 'numeric', 'min:0', 'max:100000000', 'distinct'],
            'loyalty_tiers.*.multiplier' => ['required', 'numeric', 'min:1', 'max:10'],
        ], [], [
            'loyalty_tiers' => __('loyalty.tiers'),
            'loyalty_tiers.*.name' => __('loyalty.tier_name'),
            'loyalty_tiers.*.min_spend' => __('loyalty.tier_min_spend'),
            'loyalty_tiers.*.multiplier' => __('loyalty.tier_multiplier'),
        ]);

        if (array_key_exists('loyalty_tiers', $settings)) {
            $settings['loyalty_tiers'] = $this->tiers($settings['loyalty_tiers']);
        }

        if ($settings['loyalty_enabled'] && ! $store->hasFeature(PlanFeature::Loyalty)) {
            throw ValidationException::withMessages(['loyalty_enabled' => __('billing.feature_unavailable')]);
        }

        $store->forceFill($settings)->save();

        return response()->json($this->payload($store));
    }

    /**
     * The tiers as stored: lowest spend first, amounts and multipliers rounded to 2 places.
     *
     * @param  list<array{name: string, min_spend: numeric, multiplier: numeric}>  $tiers
     * @return list<array{name: string, min_spend: float, multiplier: float}>|null
     */
    private function tiers(array $tiers): ?array
    {
        if ($tiers === []) {
            return null;
        }

        return collect($tiers)
            ->map(fn (array $tier): array => ['name' => trim($tier['name']), 'min_spend' => round((float) $tier['min_spend'], 2), 'multiplier' => round((float) $tier['multiplier'], 2)])
            ->sortBy('min_spend')
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(Store $store): array
    {
        $totals = $store->loyaltyTransactions()->toBase()
            ->selectRaw('type, coalesce(sum(points), 0) as points')
            ->groupBy('type')
            ->pluck('points', 'type');

        $outstanding = (int) $store->customers()->sum('points_balance');

        return [
            'available' => $store->hasFeature(PlanFeature::Loyalty),
            'settings' => [
                'loyalty_enabled' => $store->loyalty_enabled,
                'loyalty_earn_rate' => $store->loyalty_earn_rate,
                'loyalty_point_value' => $store->loyalty_point_value,
                'loyalty_min_redeem' => $store->loyalty_min_redeem,
                'loyalty_tiers' => $store->loyaltyTiers(),
            ],
            'stats' => [
                'members' => $store->customers()->where('points_balance', '>', 0)->count(),
                'outstanding_points' => $outstanding,
                'outstanding_value' => round($outstanding * $store->loyalty_point_value, 2),
                'earned_points' => (int) ($totals[LoyaltyTransactionType::Earned->value] ?? 0),
                'redeemed_points' => (int) -($totals[LoyaltyTransactionType::Redeemed->value] ?? 0) - (int) ($totals[LoyaltyTransactionType::Refunded->value] ?? 0),
            ],
        ];
    }
}
