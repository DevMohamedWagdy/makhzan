<?php

namespace App\Http\Resources;

use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A shopper as the store's vendor sees them: contact details and order stats (loaded through
 * Customer::withOrderStats()), plus the address book on the detail view.
 *
 * @mixin Customer
 */
class StoreCustomerResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $totalSpent = round((float) $this->total_spent, 2);

        return [
            'customer_id' => $this->id,
            'full_name' => $this->full_name,
            'phone' => $this->phone,
            'email' => $this->email,
            'stats' => [
                'orders_count' => (int) $this->orders_count,
                'delivered_orders' => (int) $this->delivered_orders_count,
                'failed_orders' => (int) $this->failed_orders_count,
                'total_spent' => $totalSpent,
                'average_order' => $this->delivered_orders_count ? round($totalSpent / $this->delivered_orders_count, 2) : 0,
            ],
            'addresses' => CustomerAddressResource::collection($this->whenLoaded('addresses')),
            'last_order_at' => $this->last_order_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
