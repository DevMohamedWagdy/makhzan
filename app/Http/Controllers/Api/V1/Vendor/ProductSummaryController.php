<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Enums\ProductStatus;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductSummaryController extends Controller
{
    /**
     * Products page KPI cards and status-tab counts.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $products = $request->user()->store->products();
        $threshold = (int) config('makhzan.products.low_stock_threshold');

        $totals = (clone $products)
            ->toBase()
            ->selectRaw('count(*) as total')
            ->selectRaw('sum(case when status = ? then 1 else 0 end) as active', [ProductStatus::Active->value])
            ->selectRaw('sum(case when status = ? then 1 else 0 end) as draft', [ProductStatus::Draft->value])
            ->selectRaw('sum(case when status = ? then 1 else 0 end) as archived', [ProductStatus::Archived->value])
            ->first();

        return response()->json([
            'total' => (int) $totals->total,
            'active' => (int) $totals->active,
            'draft' => (int) $totals->draft,
            'archived' => (int) $totals->archived,
            'out_of_stock' => (clone $products)->stockLevel('out')->count(),
            'low_stock' => (clone $products)->stockLevel('low')->count(),
            'low_stock_threshold' => $threshold,
        ]);
    }
}
