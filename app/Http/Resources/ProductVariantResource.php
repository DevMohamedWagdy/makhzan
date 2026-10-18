<?php

namespace App\Http\Resources;

use App\Models\ProductVariant;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ProductVariant
 */
class ProductVariantResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'variant_id' => $this->id,
            'option_values' => $this->option_values,
            'title' => $this->title(),
            'sku' => $this->sku,
            'price' => $this->price,
            'compare_at_price' => $this->compare_at_price,
            'cost' => $this->cost,
            'stock' => $this->stock,
            'low_stock_threshold' => $this->low_stock_threshold,
            'warehouses' => $this->whenLoaded('warehouseStocks', fn (): array => $this->warehouseStocks
                ->map(fn ($warehouseStock): array => ['warehouse_id' => $warehouseStock->warehouse_id, 'stock' => $warehouseStock->stock])
                ->values()
                ->all()),
        ];
    }
}
