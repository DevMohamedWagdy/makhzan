<?php

namespace App\Http\Resources;

use App\Models\StockTransfer;
use App\Models\StockTransferItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin StockTransfer
 */
class StockTransferResource extends JsonResource
{
    /**
     * Transform the resource into an array. Expects items to be loaded.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'transfer_id' => $this->id,
            'number' => $this->number,
            'from_warehouse' => ['warehouse_id' => $this->from_warehouse_id, 'name' => $this->from_warehouse_name],
            'to_warehouse' => ['warehouse_id' => $this->to_warehouse_id, 'name' => $this->to_warehouse_name],
            'note' => $this->note,
            'items' => $this->items->map(fn (StockTransferItem $item): array => [
                'variant_id' => $item->product_variant_id,
                'product_name' => $item->product_name,
                'variant_title' => $item->variant_title,
                'quantity' => $item->quantity,
            ]),
            'units' => (int) $this->items->sum('quantity'),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
