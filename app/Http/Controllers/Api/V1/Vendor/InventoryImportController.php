<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Actions\Inventory\ImportInventory;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Vendor\ImportInventoryRequest;
use App\Http\Resources\InventoryItemResource;
use App\Models\ProductVariant;
use App\Models\Warehouse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InventoryImportController extends Controller
{
    /** Most variants one export returns. */
    private const MAX_EXPORT = 5000;

    /**
     * Every variant for the spreadsheet export (the SPA writes the CSV), with its quantity in
     * each warehouse.
     */
    public function export(Request $request): JsonResponse
    {
        $variants = ProductVariant::query()
            ->inventoryOf($request->user()->store)
            ->with(['product.images', 'product.store.warehouses', 'warehouseStocks'])
            ->orderBy('products.name')
            ->orderBy('product_variants.position')
            ->limit(self::MAX_EXPORT)
            ->get();

        return response()->json(['data' => InventoryItemResource::collection($variants)]);
    }

    /**
     * Apply counted quantities (to one warehouse) and costs from an edited export; bad rows
     * are reported, not fatal.
     */
    public function import(ImportInventoryRequest $request, ImportInventory $importInventory): JsonResponse
    {
        $warehouse = $request->filled('warehouse_id') ? Warehouse::query()->find($request->validated('warehouse_id')) : null;

        return response()->json($importInventory->handle($request->user()->store, $request->validated('rows'), $warehouse));
    }
}
