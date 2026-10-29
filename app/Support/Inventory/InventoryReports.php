<?php

namespace App\Support\Inventory;

use App\Enums\OrderStatus;
use App\Models\ProductVariant;
use App\Models\Store;
use App\Models\Warehouse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Reports on the stock a store holds: what it's worth (per warehouse and per category) and what hasn't
 * sold for a while. Values use each variant's average cost and its selling price; deleted products are
 * left out.
 */
class InventoryReports
{
    /**
     * Units and value at cost and at selling price, per warehouse and per category, with the totals.
     *
     * @return array{totals: array{units: int, cost_value: float, retail_value: float, missing_cost: int}, warehouses: list<array<string, mixed>>, categories: list<array<string, mixed>>}
     */
    public static function value(Store $store): array
    {
        $warehouses = DB::table('warehouse_stocks')
            ->join('warehouses', 'warehouses.id', '=', 'warehouse_stocks.warehouse_id')
            ->join('product_variants', 'product_variants.id', '=', 'warehouse_stocks.product_variant_id')
            ->join('products', 'products.id', '=', 'product_variants.product_id')
            ->where('warehouses.store_id', $store->id)
            ->whereNull('products.deleted_at')
            ->groupBy('warehouses.id', 'warehouses.name', 'warehouses.priority')
            ->orderBy('warehouses.priority')
            ->selectRaw('warehouses.id, warehouses.name, sum(warehouse_stocks.stock) as units')
            ->selectRaw('sum(warehouse_stocks.stock * coalesce(product_variants.cost, 0)) as cost_value')
            ->selectRaw('sum(warehouse_stocks.stock * product_variants.price) as retail_value')
            ->selectRaw('sum(case when warehouse_stocks.stock > 0 and product_variants.cost is null then 1 else 0 end) as missing_cost')
            ->get()
            ->map(fn (object $row): array => ['warehouse_id' => (int) $row->id, 'name' => $row->name, ...self::figures($row)])
            ->all();

        $categories = DB::table('product_variants')
            ->join('products', 'products.id', '=', 'product_variants.product_id')
            ->join('product_categories', 'product_categories.id', '=', 'products.category_id')
            ->where('products.store_id', $store->id)
            ->whereNull('products.deleted_at')
            ->groupBy('product_categories.id', 'product_categories.name', 'product_categories.name_en')
            ->selectRaw('product_categories.id, product_categories.name, product_categories.name_en, sum(product_variants.stock) as units')
            ->selectRaw('sum(product_variants.stock * coalesce(product_variants.cost, 0)) as cost_value')
            ->selectRaw('sum(product_variants.stock * product_variants.price) as retail_value')
            ->selectRaw('sum(case when product_variants.stock > 0 and product_variants.cost is null then 1 else 0 end) as missing_cost')
            ->get()
            ->map(fn (object $row): array => ['category_id' => (int) $row->id, 'name' => $row->name, 'name_en' => $row->name_en, ...self::figures($row)])
            ->sortByDesc('cost_value')
            ->values()
            ->all();

        return [
            'totals' => [
                'units' => (int) collect($categories)->sum('units'),
                'cost_value' => round((float) collect($categories)->sum('cost_value'), 2),
                'retail_value' => round((float) collect($categories)->sum('retail_value'), 2),
                'missing_cost' => (int) collect($categories)->sum('missing_cost'),
            ],
            'warehouses' => $warehouses,
            'categories' => $categories,
        ];
    }

    /**
     * What one warehouse holds: every variant with units in it, the most money tied up first, with its
     * quantity there and in the store as a whole. The level (low / out) compares the warehouse's own
     * quantity with the variant's low-stock threshold.
     *
     * @return array{warehouse: array{warehouse_id: int, name: string}, totals: array{variants: int, units: int, cost_value: float, retail_value: float, low: int, missing_cost: int}, items: list<array<string, mixed>>}
     */
    public static function warehouse(Store $store, Warehouse $warehouse): array
    {
        $variants = ProductVariant::query()
            ->inventoryOf($store)
            ->join('warehouse_stocks', 'warehouse_stocks.product_variant_id', '=', 'product_variants.id')
            ->where('warehouse_stocks.warehouse_id', $warehouse->id)
            ->where('warehouse_stocks.stock', '>', 0)
            ->whereNull('products.deleted_at')
            ->addSelect('warehouse_stocks.stock as warehouse_stock')
            ->with('product.category')
            ->orderByRaw('warehouse_stocks.stock * coalesce(product_variants.cost, product_variants.price) desc')
            ->get();

        $items = $variants->map(function (ProductVariant $variant) use ($store): array {
            $units = (int) $variant->warehouse_stock;
            $threshold = $variant->lowStockThreshold($store);

            return [
                'variant_id' => $variant->id,
                'product_id' => $variant->product_id,
                'product_name' => $variant->product->name,
                'product_name_en' => $variant->product->name_en,
                'variant_title' => $variant->title() ?: null,
                'sku' => $variant->sku,
                'category' => $variant->product->category?->name,
                'units' => $units,
                'total_stock' => $variant->stock,
                'is_low' => $units <= $threshold,
                'cost' => $variant->cost === null ? null : (float) $variant->cost,
                'price' => (float) $variant->price,
                'cost_value' => round($units * (float) ($variant->cost ?? 0), 2),
                'retail_value' => round($units * (float) $variant->price, 2),
            ];
        });

        return [
            'warehouse' => ['warehouse_id' => $warehouse->id, 'name' => $warehouse->name],
            'totals' => [
                'variants' => $items->count(),
                'units' => (int) $items->sum('units'),
                'cost_value' => round((float) $items->sum('cost_value'), 2),
                'retail_value' => round((float) $items->sum('retail_value'), 2),
                'low' => $items->where('is_low', true)->count(),
                'missing_cost' => $items->whereNull('cost')->count(),
            ],
            'items' => $items->all(),
        ];
    }

    /**
     * Variants in stock that haven't sold (in an order that wasn't cancelled) for `days` days, most money
     * tied up first. Variants added within the period aren't counted: they haven't had the time to sell.
     *
     * @return array{days: int, totals: array{variants: int, units: int, cost_value: float}, items: list<array<string, mixed>>}
     */
    public static function deadStock(Store $store, int $days, int $limit = 300): array
    {
        $since = now()->subDays($days);

        $lastSold = DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->where('orders.store_id', $store->id)
            ->where('orders.status', '!=', OrderStatus::Cancelled->value)
            ->whereNotNull('order_items.product_variant_id')
            ->groupBy('order_items.product_variant_id')
            ->selectRaw('order_items.product_variant_id, max(orders.created_at) as last_sold_at');

        $variants = ProductVariant::query()
            ->inventoryOf($store)
            ->whereNull('products.deleted_at')
            ->where('product_variants.stock', '>', 0)
            ->where('product_variants.created_at', '<', $since)
            ->leftJoinSub($lastSold, 'sold', 'sold.product_variant_id', '=', 'product_variants.id')
            ->where(fn ($query) => $query->whereNull('sold.last_sold_at')->orWhere('sold.last_sold_at', '<', $since))
            ->addSelect('sold.last_sold_at')
            ->with('product.category')
            ->orderByRaw('product_variants.stock * coalesce(product_variants.cost, product_variants.price) desc')
            ->limit($limit)
            ->get();

        $items = $variants->map(fn (ProductVariant $variant): array => [
            'variant_id' => $variant->id,
            'product_id' => $variant->product_id,
            'product_name' => $variant->product->name,
            'product_name_en' => $variant->product->name_en,
            'variant_title' => $variant->title() ?: null,
            'category' => $variant->product->category?->name,
            'status' => $variant->product->status->value,
            'stock' => $variant->stock,
            'cost' => $variant->cost === null ? null : (float) $variant->cost,
            'price' => (float) $variant->price,
            'cost_value' => round($variant->stock * (float) ($variant->cost ?? 0), 2),
            'last_sold_at' => $variant->last_sold_at ? Carbon::parse($variant->last_sold_at)->toIso8601String() : null,
        ])->all();

        return [
            'days' => $days,
            'totals' => [
                'variants' => count($items),
                'units' => (int) collect($items)->sum('stock'),
                'cost_value' => round((float) collect($items)->sum('cost_value'), 2),
            ],
            'items' => $items,
        ];
    }

    /**
     * @return array{units: int, cost_value: float, retail_value: float, missing_cost: int}
     */
    private static function figures(object $row): array
    {
        return [
            'units' => (int) $row->units,
            'cost_value' => round((float) $row->cost_value, 2),
            'retail_value' => round((float) $row->retail_value, 2),
            'missing_cost' => (int) $row->missing_cost,
        ];
    }
}
