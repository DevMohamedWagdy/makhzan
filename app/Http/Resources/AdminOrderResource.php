<?php

namespace App\Http\Resources;

use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * An order in the platform-wide list.
 *
 * @mixin Order
 */
class AdminOrderResource extends JsonResource
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
            'store' => $this->whenLoaded('store', fn (): array => ['store_id' => $this->store->id, 'name' => $this->store->name, 'slug' => $this->store->slug]),
            'status' => $this->status,
            'payment_method' => $this->payment_method,
            'payment_status' => $this->payment_status,
            'total' => $this->total,
            'recipient_name' => $this->recipient_name,
            'phone' => $this->phone,
            'governorate_id' => $this->governorate_id,
            'items_count' => $this->whenCounted('items'),
            'shipment' => $this->shipment(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
