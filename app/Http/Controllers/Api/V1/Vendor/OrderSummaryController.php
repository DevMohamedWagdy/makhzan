<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderSummaryController extends Controller
{
    /**
     * Status-tab counts and KPI cards for the orders page (and the sidebar's pending count).
     */
    public function __invoke(Request $request): JsonResponse
    {
        $orders = $request->user()->store->orders();

        $counts = (clone $orders)->toBase()->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');
        $delivered = (clone $orders)->where('status', OrderStatus::Delivered);

        return response()->json([
            ...collect(OrderStatus::cases())->mapWithKeys(fn (OrderStatus $status): array => [$status->value => (int) ($counts[$status->value] ?? 0)]),
            'total' => (int) $counts->sum(),
            'delivered_revenue' => (float) (clone $delivered)->sum('total'),
            'today' => (clone $orders)->where('created_at', '>=', today())->count(),
        ]);
    }
}
