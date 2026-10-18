<?php

namespace App\Http\Resources;

use App\Models\ProductVariant;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A variant on the inventory page: its product, stock level, cost and the value on the shelf.
 * Expects product.images and product.store to be loaded; with product.store.warehouses and
 * warehouseStocks also loaded it adds the quantity in each warehouse.
 *
 * @mixin ProductVariant
 */
class InventoryItemResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $store = $this->product->store;

        return [
            'variant_id' => $this->id,
            'product_id' => $this->product_id,
            'product_name' => $this->product->name,
            'product_name_en' => $this->product->name_en,
            'product_status' => $this->product->status,
            'variant_title' => $this->title() ?: null,
            'sku' => $this->sku,
            'image_url' => $this->product->images->first()?->url,
            'price' => $this->price,
            'cost' => $this->cost,
            'margin' => $this->cost !== null && $this->price > 0 ? round(($this->price - $this->cost) / $this->price * 100, 1) : null,
            'stock' => $this->stock,
            'low_stock_threshold' => $this->low_stock_threshold,
            'effective_threshold' => $this->lowStockThreshold($store),
            'level' => $this->stockLevelIn($store),
            'stock_value' => $this->cost !== null ? round($this->cost * $this->stock, 2) : null,
            'retail_value' => round($this->price * $this->stock, 2),
            'warehouses' => $this->when(
                $this->relationLoaded('warehouseStocks') && $store->relationLoaded('warehouses'),
                fn (): array => $this->warehouseBreakdown(),
            ),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }

    /**
     * Quantity per warehouse in fulfilment order. Stock not yet assigned to a warehouse
     * counts toward the default one, as ChangeStock treats it.
     *
     * @return list<array{warehouse_id: int, name: string, stock: int}>
     */
    private function warehouseBreakdown(): array
    {
        $stocks = $this->warehouseStocks->pluck('stock', 'warehouse_id');
        $unallocated = $this->stock - (int) $stocks->sum();

        return $this->product->store->warehouses->values()->map(fn ($warehouse, int $index): array => [
            'warehouse_id' => $warehouse->id,
            'name' => $warehouse->name,
            'stock' => max(0, (int) ($stocks[$warehouse->id] ?? 0) + ($index === 0 ? $unallocated : 0)),
        ])->all();
    }
}
