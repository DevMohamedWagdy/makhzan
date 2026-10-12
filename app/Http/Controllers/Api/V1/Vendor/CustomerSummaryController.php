<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerSummaryController extends Controller
{
    /**
     * Customers page KPI cards: all accounts, sign-ups this month, buyers and repeat buyers.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $store = $request->user()->store;

        $orderCounts = $store->orders()->toBase()
            ->whereNotNull('customer_id')
            ->selectRaw('customer_id, count(*) as orders')
            ->groupBy('customer_id');

        $buyers = $store->customers()->toBase()
            ->joinSub($orderCounts, 'order_counts', fn ($join) => $join->on('order_counts.customer_id', '=', 'customers.id'))
            ->selectRaw('count(*) as buyers')
            ->selectRaw('sum(case when order_counts.orders > 1 then 1 else 0 end) as repeat_buyers')
            ->first();

        return response()->json([
            'total' => $store->customers()->count(),
            'new_this_month' => $store->customers()->where('created_at', '>=', now()->startOfMonth())->count(),
            'buyers' => (int) $buyers->buyers,
            'repeat_buyers' => (int) $buyers->repeat_buyers,
        ]);
    }
}
