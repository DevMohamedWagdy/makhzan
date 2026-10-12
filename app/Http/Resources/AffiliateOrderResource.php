<?php

namespace App\Http\Resources;

use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * An order as the referring affiliate sees it: what was sold and their commission, never the
 * customer's name, phone or address beyond the governorate.
 *
 * @mixin Order
 */
class AffiliateOrderResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'order_id' => $this->id,
            'number' => $this->number,
            'status' => $this->status,
            'governorate_id' => $this->governorate_id,
            'items' => $this->items->map(fn ($item): array => ['product_name' => $item->product_name, 'variant_title' => $item->variant_title, 'quantity' => $item->quantity]),
            'items_count' => $this->items->sum('quantity'),
            'subtotal' => $this->subtotal,
            'commission_amount' => $this->commission_amount,
            'commission_status' => $this->commission_status,
            'created_at' => $this->created_at?->toIso8601String(),
            'delivered_at' => $this->delivered_at?->toIso8601String(),
        ];
    }
}
