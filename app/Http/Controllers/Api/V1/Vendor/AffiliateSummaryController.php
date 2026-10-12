<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Enums\AffiliateStatus;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AffiliateSummaryController extends Controller
{
    /**
     * Dashboard KPI cards and status-tab counts, in a single aggregate query.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $totals = $request->user()->store->affiliates()
            ->toBase()
            ->selectRaw('count(*) as total')
            ->selectRaw('sum(case when status = ? then 1 else 0 end) as active', [AffiliateStatus::Active->value])
            ->selectRaw('sum(case when status = ? then 1 else 0 end) as frozen', [AffiliateStatus::Frozen->value])
            ->selectRaw('sum(case when status = ? then 1 else 0 end) as pending', [AffiliateStatus::Pending->value])
            ->selectRaw('coalesce(sum(sales_total), 0) as sales_total')
            ->selectRaw('coalesce(sum(earned_commission), 0) as earned_commission')
            ->first();

        return response()->json([
            'total' => (int) $totals->total,
            'active' => (int) $totals->active,
            'frozen' => (int) $totals->frozen,
            'pending' => (int) $totals->pending,
            'sales_total' => (float) $totals->sales_total,
            'earned_commission' => (float) $totals->earned_commission,
        ]);
    }
}
