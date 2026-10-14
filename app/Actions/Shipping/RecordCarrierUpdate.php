<?php

namespace App\Actions\Shipping;

use App\Actions\Orders\UpdateOrderStatus;
use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\OrderEvent;
use App\Support\Shipping\BostaClient;
use Illuminate\Validation\ValidationException;

/**
 * Applies a Bosta status update: always records the carrier's status, and moves the order
 * to delivered or returned when Bosta reports it (if the order can still move there).
 */
class RecordCarrierUpdate
{
    public function __construct(private UpdateOrderStatus $updateStatus) {}

    public function handle(Order $order, int $stateCode, ?string $description): Order
    {
        $order->forceFill([
            'carrier_status_code' => $stateCode,
            'carrier_status' => $description ? mb_substr($description, 0, 120) : $order->carrier_status,
            'carrier_updated_at' => now(),
        ])->save();

        $status = match ($stateCode) {
            BostaClient::STATE_DELIVERED => OrderStatus::Delivered,
            BostaClient::STATE_RETURNED => OrderStatus::Returned,
            default => null,
        };

        if (! $status || ! $order->status->canMoveTo($status)) {
            return $order;
        }

        try {
            return $this->updateStatus->handle($order, $status, OrderEvent::ACTOR_SYSTEM, __('orders.shipping.updated_by_bosta'));
        } catch (ValidationException) {
            return $order->refresh();
        }
    }
}
