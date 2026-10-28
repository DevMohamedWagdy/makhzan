<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Http\Controllers\Controller;
use App\Support\Inventory\InventoryReports;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Inventory reports: what the stock is worth and what isn't selling.
 */
class InventoryReportController extends Controller
{
    public function value(Request $request): JsonResponse
    {
        return response()->json(['data' => InventoryReports::value($request->user()->store)]);
    }

    public function deadStock(Request $request): JsonResponse
    {
        $days = (int) ($request->validate(['days' => ['nullable', 'integer', Rule::in([30, 60, 90, 180])]])['days'] ?? 60);

        return response()->json(['data' => InventoryReports::deadStock($request->user()->store, $days)]);
    }
}
