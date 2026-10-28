<?php

namespace App\Support\Purchasing;

use App\Enums\OrderStatus;
use App\Enums\ProductStatus;
use App\Enums\PurchaseOrderStatus;
use App\Models\ProductVariant;
use App\Models\Store;
use App\Models\Supplier;
use Illuminate\Support\Facades\DB;

/**
 * What to buy next: variants whose stock, plus what's already on order, won't last the coming `coverDays`
 * at the pace they sold over the last `days`, or that are at or under their low-stock threshold. Each comes
 * with the quantity that brings it back to cover and the supplier and cost of its latest purchase order.
 */
class ReorderSuggestions
{
    /**
     * @return array{days: int, cover_days: int, totals: array{variants: int, units: int, cost: float}, suppliers: list<array{supplier_id: int, name: string}>, items: list<array<string, mixed>>}
     */
    public static function for(Store $store, int $days = 30, int $coverDays = 30, int $limit = 300): array
    {
        $sold = DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->where('orders.store_id', $store->id)
            ->where('orders.status', '!=', OrderStatus::Cancelled->value)
            ->where('orders.created_at', '>=', now()->subDays($days))
            ->whereNotNull('order_items.product_variant_id')
            ->groupBy('order_items.product_variant_id')
            ->selectRaw('order_items.product_variant_id, sum(order_items.quantity) as units');

        $incoming = DB::table('purchase_order_items')
            ->join('purchase_orders', 'purchase_orders.id', '=', 'purchase_order_items.purchase_order_id')
            ->where('purchase_orders.store_id', $store->id)
            ->whereIn('purchase_orders.status', [PurchaseOrderStatus::Ordered->value, PurchaseOrderStatus::Partial->value])
            ->whereNotNull('purchase_order_items.product_variant_id')
            ->groupBy('purchase_order_items.product_variant_id')
            ->selectRaw('purchase_order_items.product_variant_id, sum(purchase_order_items.quantity_ordered - purchase_order_items.quantity_received) as units');

        $variants = ProductVariant::query()
            ->inventoryOf($store)
            ->whereNull('products.deleted_at')
            ->where('products.status', '!=', ProductStatus::Archived->value)
            ->leftJoinSub($sold, 'sold', 'sold.product_variant_id', '=', 'product_variants.id')
            ->leftJoinSub($incoming, 'incoming', 'incoming.product_variant_id', '=', 'product_variants.id')
            ->addSelect(DB::raw('coalesce(sold.units, 0) as sold_units'), DB::raw('coalesce(incoming.units, 0) as incoming_units'))
            ->addSelect(DB::raw('coalesce(product_variants.low_stock_threshold, stores.low_stock_threshold) as threshold'))
            // Cheap pre-filter; the exact need is worked out below.
            ->where(fn ($query) => $query
                ->whereRaw('product_variants.stock + coalesce(incoming.units, 0) <= coalesce(product_variants.low_stock_threshold, stores.low_stock_threshold)')
                ->orWhereRaw('product_variants.stock + coalesce(incoming.units, 0) < coalesce(sold.units, 0) * ? / ?', [$coverDays, $days]))
            ->with('product')
            ->get();

        $lastPurchases = self::lastPurchases($variants->pluck('id')->all());
        $supplierNames = Supplier::query()->whereIn('id', collect($lastPurchases)->pluck('supplier_id')->unique())->pluck('name', 'id');

        $items = $variants
            ->map(function (ProductVariant $variant) use ($days, $coverDays, $lastPurchases, $supplierNames): ?array {
                $dailySales = $variant->sold_units / $days;
                $available = $variant->stock + (int) $variant->incoming_units;
                $target = max((int) ceil($dailySales * $coverDays), (int) $variant->threshold + 1);
                $suggested = $target - $available;

                if ($suggested <= 0) {
                    return null;
                }

                $purchase = $lastPurchases[$variant->id] ?? null;
                $unitCost = $purchase['unit_cost'] ?? ($variant->cost === null ? null : (float) $variant->cost);

                return [
                    'variant_id' => $variant->id,
                    'product_id' => $variant->product_id,
                    'product_name' => $variant->product->name,
                    'product_name_en' => $variant->product->name_en,
                    'variant_title' => $variant->title() ?: null,
                    'sku' => $variant->sku,
                    'stock' => $variant->stock,
                    'incoming' => (int) $variant->incoming_units,
                    'threshold' => (int) $variant->threshold,
                    'sold' => (int) $variant->sold_units,
                    'daily_sales' => round($dailySales, 2),
                    'days_left' => $dailySales > 0 ? (int) floor($variant->stock / $dailySales) : null,
                    'suggested_quantity' => $suggested,
                    'unit_cost' => $unitCost,
                    'supplier_id' => $purchase['supplier_id'] ?? null,
                    'supplier_name' => isset($purchase['supplier_id']) ? $supplierNames[$purchase['supplier_id']] ?? null : null,
                ];
            })
            ->filter()
            // Most urgent first: out of stock, then fewest days of stock left, then the fastest sellers.
            ->sortBy(fn (array $item): array => [$item['stock'] > 0 ? 1 : 0, $item['days_left'] ?? PHP_INT_MAX, -$item['daily_sales']])
            ->take($limit)
            ->values();

        return [
            'days' => $days,
            'cover_days' => $coverDays,
            'totals' => [
                'variants' => $items->count(),
                'units' => (int) $items->sum('suggested_quantity'),
                'cost' => round((float) $items->sum(fn (array $item): float => $item['suggested_quantity'] * (float) ($item['unit_cost'] ?? 0)), 2),
            ],
            'suppliers' => $items
                ->whereNotNull('supplier_id')
                ->unique('supplier_id')
                ->map(fn (array $item): array => ['supplier_id' => $item['supplier_id'], 'name' => $item['supplier_name']])
                ->values()
                ->all(),
            'items' => $items->all(),
        ];
    }

    /**
     * The supplier and unit cost of each variant's most recent purchase-order line (cancelled orders aside).
     *
     * @param  list<int>  $variantIds
     * @return array<int, array{supplier_id: int, unit_cost: float}>
     */
    private static function lastPurchases(array $variantIds): array
    {
        if ($variantIds === []) {
            return [];
        }

        $latest = DB::table('purchase_order_items')
            ->join('purchase_orders', 'purchase_orders.id', '=', 'purchase_order_items.purchase_order_id')
            ->whereIn('purchase_order_items.product_variant_id', $variantIds)
            ->where('purchase_orders.status', '!=', PurchaseOrderStatus::Cancelled->value)
            ->groupBy('purchase_order_items.product_variant_id')
            ->selectRaw('max(purchase_order_items.id) as id');

        return DB::table('purchase_order_items')
            ->join('purchase_orders', 'purchase_orders.id', '=', 'purchase_order_items.purchase_order_id')
            ->whereIn('purchase_order_items.id', $latest)
            ->get(['purchase_order_items.product_variant_id', 'purchase_orders.supplier_id', 'purchase_order_items.unit_cost'])
            ->mapWithKeys(fn (object $row): array => [(int) $row->product_variant_id => ['supplier_id' => (int) $row->supplier_id, 'unit_cost' => (float) $row->unit_cost]])
            ->all();
    }
}
