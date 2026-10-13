<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Http\Controllers\Controller;
use App\Models\ProductVariant;
use App\Models\Store;
use App\Models\WarehouseStock;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InventorySummaryController extends Controller
{
    /**
     * Inventory page KPI cards: units and value on the shelf, stock levels and variants
     * still missing a cost (which leaves them out of the value and profit figures).
     */
    public function __invoke(Request $request): JsonResponse
    {
        $store = $request->user()->store;
        $variants = fn () => ProductVariant::query()->inventoryOf($store);

        // Drop inventoryOf()'s product_variants.* select: MySQL refuses it next to aggregates.
        $totals = $variants()->select([])->toBase()
            ->selectRaw('count(*) as variants')
            ->selectRaw('coalesce(sum(product_variants.stock), 0) as units')
            ->selectRaw('coalesce(sum(product_variants.stock * product_variants.cost), 0) as cost_value')
            ->selectRaw('coalesce(sum(product_variants.stock * product_variants.price), 0) as retail_value')
            ->selectRaw('coalesce(sum(case when product_variants.cost is not null then product_variants.stock * product_variants.price else 0 end), 0) as costed_retail_value')
            ->selectRaw('sum(case when product_variants.cost is null then 1 else 0 end) as missing_cost')
            ->first();

        $costValue = round((float) $totals->cost_value, 2);

        return response()->json([
            'variants' => (int) $totals->variants,
            'units' => (int) $totals->units,
            'cost_value' => $costValue,
            'retail_value' => round((float) $totals->retail_value, 2),
            'expected_profit' => round((float) $totals->costed_retail_value - $costValue, 2),
            'missing_cost' => (int) $totals->missing_cost,
            'in' => $variants()->stockLevel('in')->count(),
            'low' => $variants()->stockLevel('low')->count(),
            'out' => $variants()->stockLevel('out')->count(),
            'low_stock_threshold' => $store->low_stock_threshold,
            'warehouses' => $this->warehouses($store),
        ]);
    }

    /**
     * Units and value at cost per warehouse, in fulfilment order. Stock not yet assigned to a
     * warehouse counts toward the default one.
     *
     * @return list<array{warehouse_id: int, name: string, units: int, cost_value: float}>
     */
    private function warehouses(Store $store): array
    {
        $totals = WarehouseStock::query()
            ->join('product_variants', 'product_variants.id', '=', 'warehouse_stocks.product_variant_id')
            ->whereIn('warehouse_stocks.warehouse_id', $store->warehouses()->select('id'))
            ->groupBy('warehouse_stocks.warehouse_id')
            ->selectRaw('warehouse_stocks.warehouse_id, sum(warehouse_stocks.stock) as units, coalesce(sum(warehouse_stocks.stock * product_variants.cost), 0) as cost_value')
            ->toBase()
            ->get()
            ->keyBy('warehouse_id');

        $allocated = (int) $totals->sum('units');
        $total = (int) ProductVariant::query()->inventoryOf($store)->sum('product_variants.stock');

        return $store->warehouses->values()->map(fn ($warehouse, int $index): array => [
            'warehouse_id' => $warehouse->id,
            'name' => $warehouse->name,
            'units' => (int) ($totals[$warehouse->id]->units ?? 0) + ($index === 0 ? $total - $allocated : 0),
            'cost_value' => round((float) ($totals[$warehouse->id]->cost_value ?? 0), 2),
        ])->all();
    }
}
