<?php

namespace App\Http\Resources;

use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin StockMovement
 */
class StockMovementResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'movement_id' => $this->id,
            'type' => $this->type,
            'product_id' => $this->product_id,
            'variant_id' => $this->product_variant_id,
            'product_name' => $this->product_name,
            'variant_title' => $this->variant_title,
            'warehouse' => $this->warehouse_name ? ['warehouse_id' => $this->warehouse_id, 'name' => $this->warehouse_name] : null,
            'quantity' => $this->quantity,
            'stock_before' => $this->stock_before,
            'stock_after' => $this->stock_after,
            'warehouse_stock_before' => $this->warehouse_stock_before,
            'warehouse_stock_after' => $this->warehouse_stock_after,
            'unit_cost' => $this->unit_cost,
            'order' => $this->order ? ['order_id' => $this->order->id, 'number' => $this->order->number] : null,
            'transfer' => $this->transfer ? ['transfer_id' => $this->transfer->id, 'number' => $this->transfer->number] : null,
            'purchase_order' => $this->purchaseOrder ? ['purchase_order_id' => $this->purchaseOrder->id, 'number' => $this->purchaseOrder->number] : null,
            'actor' => $this->actor,
            'note' => $this->note,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
