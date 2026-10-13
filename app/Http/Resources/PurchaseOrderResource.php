<?php

namespace App\Http\Resources;

use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A purchase order with its supplier, items (ordered / received / remaining) and totals.
 * Expects supplier, warehouse and items to be loaded.
 *
 * @mixin PurchaseOrder
 */
class PurchaseOrderResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'purchase_order_id' => $this->id,
            'number' => $this->number,
            'status' => $this->status,
            'supplier' => ['supplier_id' => $this->supplier->id, 'name' => $this->supplier->name, 'phone' => $this->supplier->phone],
            'warehouse' => $this->warehouse ? ['warehouse_id' => $this->warehouse->id, 'name' => $this->warehouse->name] : null,
            'expected_at' => $this->expected_at?->toDateString(),
            'notes' => $this->notes,
            'items' => $this->items->map(fn (PurchaseOrderItem $item): array => [
                'item_id' => $item->id,
                'product_id' => $item->product_id,
                'variant_id' => $item->product_variant_id,
                'product_name' => $item->product_name,
                'variant_title' => $item->variant_title,
                'sku' => $item->sku,
                'quantity_ordered' => $item->quantity_ordered,
                'quantity_received' => $item->quantity_received,
                'remaining' => $item->remaining(),
                'unit_cost' => $item->unit_cost,
                'line_total' => round($item->quantity_ordered * $item->unit_cost, 2),
            ]),
            'units_ordered' => (int) $this->items->sum('quantity_ordered'),
            'units_received' => (int) $this->items->sum('quantity_received'),
            'total' => $this->orderedTotal(),
            'received_total' => $this->receivedTotal(),
            'can_edit' => $this->status->isEditable(),
            'can_receive' => $this->status->canReceive(),
            'created_at' => $this->created_at?->toIso8601String(),
            'ordered_at' => $this->ordered_at?->toIso8601String(),
            'received_at' => $this->received_at?->toIso8601String(),
            'closed_at' => $this->closed_at?->toIso8601String(),
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
        ];
    }
}
