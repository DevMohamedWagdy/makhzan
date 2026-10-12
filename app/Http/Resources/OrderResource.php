<?php

namespace App\Http\Resources;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\Vendor;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * An order for the customer who placed it or the store's vendor. Affiliate attribution and
 * commission are vendor-only.
 *
 * @mixin Order
 */
class OrderResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $forVendor = $request->user() instanceof Vendor;

        return [
            'order_id' => $this->id,
            'number' => $this->number,
            'status' => $this->status,
            'next_statuses' => $forVendor ? $this->status->next() : [],
            'can_cancel' => $this->status === OrderStatus::Pending,
            'payment_method' => $this->payment_method,
            'subtotal' => $this->subtotal,
            'shipping_fee' => $this->shipping_fee,
            'total' => $this->total,
            'items_count' => $this->whenLoaded('items', fn () => $this->items->sum('quantity')),
            'items' => OrderItemResource::collection($this->whenLoaded('items')),
            'address' => [
                'recipient_name' => $this->recipient_name,
                'phone' => $this->phone,
                'governorate_id' => $this->governorate_id,
                'city_id' => $this->city_id,
                'address_line' => $this->address_line,
                'landmark' => $this->landmark,
            ],
            'customer_note' => $this->customer_note,
            'cancel_reason' => $this->cancel_reason,
            'events' => $this->whenLoaded('events', fn () => $this->events->map(fn ($event): array => [
                'status' => $event->status,
                'actor' => $event->actor,
                'note' => $event->note,
                'created_at' => $event->created_at?->toIso8601String(),
            ])),
            $this->mergeWhen($forVendor, fn (): array => [
                'customer' => $this->customer ? new CustomerResource($this->customer) : null,
                'affiliate' => $this->affiliate ? ['affiliate_id' => $this->affiliate->id, 'full_name' => $this->affiliate->full_name] : null,
                'referral_code' => $this->referral_code,
                'commission' => [
                    'type' => $this->commission_type,
                    'rate' => $this->commission_rate,
                    'amount' => $this->commission_amount,
                    'status' => $this->commission_status,
                ],
            ]),
            'created_at' => $this->created_at?->toIso8601String(),
            'confirmed_at' => $this->confirmed_at?->toIso8601String(),
            'shipped_at' => $this->shipped_at?->toIso8601String(),
            'delivered_at' => $this->delivered_at?->toIso8601String(),
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
            'returned_at' => $this->returned_at?->toIso8601String(),
        ];
    }
}
