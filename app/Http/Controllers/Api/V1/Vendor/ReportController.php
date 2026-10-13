<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Actions\Reports\BuildStoreReport;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Vendor\ReportRequest;
use Illuminate\Http\JsonResponse;

class ReportController extends Controller
{
    /**
     * Sales report for a period (default: the last 30 days) compared with the period before it.
     */
    public function __invoke(ReportRequest $request, BuildStoreReport $buildReport): JsonResponse
    {
        return response()->json($buildReport->handle($request->user()->store, $request->periodStart(), $request->periodEnd()));
    }
}
