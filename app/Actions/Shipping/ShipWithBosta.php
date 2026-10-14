<?php

namespace App\Actions\Shipping;

use App\Actions\Orders\UpdateOrderStatus;
use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\StoreShippingAccount;
use App\Support\Shipping\BostaClient;
use App\Support\Shipping\ShippingException;
use Illuminate\Validation\ValidationException;

/**
 * Hands a confirmed order to Bosta: creates the delivery, keeps its tracking number and
 * marks the order shipped (which emails the customer the tracking link).
 */
class ShipWithBosta
{
    public function __construct(private UpdateOrderStatus $updateStatus) {}

    /**
     * @throws ValidationException
     */
    public function handle(Order $order, string $actor): Order
    {
        $account = $order->store->bostaAccount ?? throw ValidationException::withMessages(['carrier' => __('orders.shipping.bosta_not_connected')]);

        if ($order->status !== OrderStatus::Confirmed) {
            throw ValidationException::withMessages(['status' => __('orders.shipping.must_be_confirmed')]);
        }

        if ($order->tracking_number) {
            throw ValidationException::withMessages(['carrier' => __('orders.shipping.already_shipped')]);
        }

        try {
            $delivery = (new BostaClient($account))->createDelivery($order);
        } catch (ShippingException $exception) {
            report($exception);

            throw ValidationException::withMessages(['carrier' => __('orders.shipping.bosta_failed', ['reason' => $exception->getMessage()])]);
        }

        $order->forceFill([
            'carrier' => StoreShippingAccount::BOSTA,
            'carrier_shipment_id' => $delivery['id'],
            'tracking_number' => $delivery['tracking_number'] ?: $delivery['id'],
            'carrier_status' => $delivery['status'],
            'carrier_updated_at' => now(),
        ])->save();

        return $this->updateStatus->handle($order, OrderStatus::Shipped, $actor);
    }
}
