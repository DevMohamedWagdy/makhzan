<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Vendor\ReorderWarehousesRequest;
use App\Http\Requests\Api\V1\Vendor\SaveWarehouseRequest;
use App\Http\Resources\WarehouseResource;
use App\Models\Warehouse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class WarehouseController extends Controller
{
    /**
     * The store's warehouses in fulfilment order with their units and value at cost.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $warehouses = $request->user()->store->warehouses()
            ->withSum('stocks as units', 'stock')
            ->addSelect(['cost_value' => DB::table('warehouse_stocks')
                ->join('product_variants', 'product_variants.id', '=', 'warehouse_stocks.product_variant_id')
                ->whereColumn('warehouse_stocks.warehouse_id', 'warehouses.id')
                ->selectRaw('coalesce(sum(warehouse_stocks.stock * product_variants.cost), 0)')])
            ->get();

        return WarehouseResource::collection($warehouses);
    }

    /**
     * A new warehouse goes last in the fulfilment order.
     */
    public function store(SaveWarehouseRequest $request): JsonResponse
    {
        $store = $request->user()->store;
        $warehouse = $store->warehouses()->create([
            ...$request->validated(),
            'priority' => (int) $store->warehouses()->max('priority') + 1,
        ]);

        return (new WarehouseResource($warehouse))->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(SaveWarehouseRequest $request, Warehouse $warehouse): WarehouseResource
    {
        $warehouse->update($request->validated());

        return new WarehouseResource($warehouse);
    }

    /**
     * Set the fulfilment order: the first warehouse becomes the default.
     */
    public function reorder(ReorderWarehousesRequest $request): AnonymousResourceCollection
    {
        $store = $request->user()->store;

        DB::transaction(function () use ($store, $request): void {
            foreach ($request->validated('warehouse_ids') as $index => $id) {
                $store->warehouses()->whereKey($id)->update(['priority' => $index + 1]);
            }
        });

        return WarehouseResource::collection($store->warehouses()->get());
    }

    /**
     * Only an empty warehouse can be deleted, and a store always keeps one.
     */
    public function destroy(Warehouse $warehouse): Response
    {
        Gate::authorize('delete', $warehouse);

        if ($warehouse->store->warehouses()->count() === 1) {
            throw ValidationException::withMessages(['warehouse' => __('inventory.warehouse_last')]);
        }

        if ($warehouse->stocks()->where('stock', '>', 0)->exists() || ($warehouse->is($warehouse->store->defaultWarehouse()) && $this->hasUnallocatedStock($warehouse))) {
            throw ValidationException::withMessages(['warehouse' => __('inventory.warehouse_not_empty')]);
        }

        $warehouse->delete();

        return response()->noContent();
    }

    /**
     * Stock recorded on variants but not yet in any warehouse counts toward the default one.
     */
    private function hasUnallocatedStock(Warehouse $warehouse): bool
    {
        $store = $warehouse->store;
        $total = (int) $store->products()->join('product_variants', 'product_variants.product_id', '=', 'products.id')->sum('product_variants.stock');
        $allocated = (int) DB::table('warehouse_stocks')->whereIn('warehouse_id', $store->warehouses()->select('id'))->sum('stock');

        return $total > $allocated;
    }
}
