<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Vendor\UpdateInventorySettingsRequest;
use Illuminate\Http\JsonResponse;

class InventorySettingsController extends Controller
{
    /**
     * Set the store-wide low-stock threshold (variants may override it).
     */
    public function update(UpdateInventorySettingsRequest $request): JsonResponse
    {
        $store = $request->user()->store;
        $store->update(['low_stock_threshold' => $request->validated('low_stock_threshold')]);

        return response()->json(['low_stock_threshold' => $store->low_stock_threshold]);
    }
}
