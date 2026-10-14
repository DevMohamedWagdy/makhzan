<?php

namespace App\Http\Controllers\Api\V1\Storefront\Customer;

use App\Http\Controllers\Controller;
use App\Http\Resources\LoyaltyTransactionResource;
use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class LoyaltyController extends Controller
{
    /**
     * The customer's points history, newest first, with their balance, what a point is worth
     * and where they stand among the store's tiers.
     */
    public function __invoke(Request $request, Store $store): AnonymousResourceCollection
    {
        $customer = $request->user();

        return LoyaltyTransactionResource::collection($customer->loyaltyTransactions()->with('order')->latest('id')->paginate(20))->additional(['summary' => [
            'enabled' => $store->loyaltyActive(),
            'balance' => $customer->points_balance,
            'balance_value' => round($customer->points_balance * $store->loyalty_point_value, 2),
            'earn_rate' => $store->loyalty_earn_rate,
            'point_value' => $store->loyalty_point_value,
            'min_redeem' => $store->loyalty_min_redeem,
            'tier' => $store->tierProgress($customer->deliveredSpend()),
        ]]);
    }
}
