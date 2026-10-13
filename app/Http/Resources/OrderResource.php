<?php

namespace App\Http\Resources;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Models\Order;
use App\Models\Vendor;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Collection;

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
            'next_statuses' => $forVendor ? $this->nextStatuses() : [],
            'can_cancel' => $this->status === OrderStatus::Pending,
            'payment_method' => $this->payment_method,
            'payment_status' => $this->payment_status,
            'payment' => $this->when($this->payment_method?->isOnline(), fn (): array => $this->payment($forVendor)),
            'subtotal' => $this->subtotal,
            'discount' => $this->discount,
            'shipping_fee' => $this->shipping_fee,
            'shipping_discount' => $this->shipping_discount,
            'coupon_code' => $this->coupon_code,
            'total' => $this->total,
            'refunded_amount' => $this->refunded_amount,
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
                'fulfillment' => $this->whenLoaded('saleMovements', fn (): ?array => $this->fulfillment()),
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

    /**
     * An unpaid online order can only be cancelled until its payment comes through.
     *
     * @return list<OrderStatus>
     */
    private function nextStatuses(): array
    {
        return array_values(array_filter($this->status->next(), fn (OrderStatus $status): bool => ! ($status === OrderStatus::Confirmed && $this->awaitingPayment())));
    }

    /**
     * Online payment details. The customer gets the open payment page while it can still be
     * paid; the vendor gets refunds and what's left to refund.
     *
     * @return array<string, mixed>
     */
    private function payment(bool $forVendor): array
    {
        $latest = $this->relationLoaded('latestPayment') ? $this->latestPayment : null;

        return [
            'status' => $this->payment_status,
            'paid_at' => $this->paid_at?->toIso8601String(),
            'expires_at' => $this->awaitingPayment() ? $this->payment_expires_at?->toIso8601String() : null,
            'can_pay' => ! $forVendor && $this->canPay(),
            'checkout_url' => $this->when(! $forVendor, fn (): ?string => $this->canPay() && $latest?->status === PaymentStatus::Pending ? $latest->checkout_url : null),
            'failure_reason' => $latest?->status === PaymentStatus::Failed ? $latest->failure_reason : null,
            $this->mergeWhen($forVendor, fn (): array => [
                'transaction_id' => $latest?->gateway_transaction_id,
                'refundable' => round(max(0, ($this->payment_status?->isPaid() ? $this->total : 0) - $this->refunded_amount), 2),
                'refunds' => $this->whenLoaded('refunds', fn () => $this->refunds->map(fn ($refund): array => [
                    'amount' => $refund->amount,
                    'reason' => $refund->reason,
                    'created_at' => $refund->created_at?->toIso8601String(),
                ])),
            ]),
        ];
    }

    /**
     * What to pick from which warehouse, for stores with more than one. Null for a single
     * warehouse (nothing to choose) and empty for orders placed before stock was tracked.
     *
     * @return list<array{warehouse_id: int|null, name: string, items: list<array{variant_id: int|null, product_name: string, variant_title: string|null, quantity: int}>}>|null
     */
    private function fulfillment(): ?array
    {
        if ($this->store->warehouses()->count() < 2) {
            return null;
        }

        return $this->saleMovements
            ->groupBy('warehouse_id')
            ->map(fn (Collection $movements): array => [
                'warehouse_id' => $movements->first()->warehouse_id,
                'name' => $movements->first()->warehouse_name ?? __('inventory.deleted_warehouse'),
                'items' => $movements->groupBy('product_variant_id')->map(fn (Collection $rows): array => [
                    'variant_id' => $rows->first()->product_variant_id,
                    'product_name' => $rows->first()->product_name,
                    'variant_title' => $rows->first()->variant_title,
                    'quantity' => -(int) $rows->sum('quantity'),
                ])->values()->all(),
            ])
            ->values()
            ->all();
    }
}
