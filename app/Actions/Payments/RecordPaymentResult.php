<?php

namespace App\Actions\Payments;

use App\Actions\Tracking\TrackOrderConversion;
use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Store;
use App\Notifications\AffiliateCommissionNotification;
use App\Notifications\CustomerOrderUpdateNotification;
use App\Notifications\LatePaymentNotification;
use App\Notifications\OrderPlacedNotification;
use App\Support\Payments\GatewayTransaction;
use App\Support\Tracking\ConversionEvent;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RecordPaymentResult
{
    public function __construct(private TrackOrderConversion $trackConversion) {}

    /**
     * Applies a gateway's report on a payment. Callbacks may repeat (the webhook and the
     * customer's redirect report the same transaction, and gateways retry), so a payment
     * that's already settled is left alone.
     *
     * A paid order is announced to the store and the affiliate now, not when it was placed.
     * A payment that lands after the order expired is kept, and the vendor is told to refund it.
     * Returns the payment the report was about, or null if it isn't one of the store's.
     */
    public function handle(Store $store, GatewayTransaction $transaction): ?Payment
    {
        $payment = $this->find($store, $transaction);

        if (! $payment) {
            Log::warning('Payment callback for an unknown payment', ['store_id' => $store->id, 'reference' => $transaction->reference, 'gateway_order_id' => $transaction->gatewayOrderId]);

            return null;
        }

        $announce = null;

        DB::transaction(function () use ($payment, $transaction, &$announce): void {
            $payment = Payment::query()->whereKey($payment->id)->lockForUpdate()->first();

            if ($payment->status !== PaymentStatus::Pending || $transaction->status === PaymentStatus::Pending) {
                return;
            }

            if ($transaction->status === PaymentStatus::Paid && abs($transaction->amount - $payment->amount) > 0.009) {
                Log::error('Payment amount mismatch', ['payment_id' => $payment->id, 'expected' => $payment->amount, 'received' => $transaction->amount]);
            }

            $payment->update([
                'status' => $transaction->status,
                'gateway_transaction_id' => $transaction->transactionId,
                'gateway_order_id' => $payment->gateway_order_id ?? $transaction->gatewayOrderId,
                'failure_reason' => $transaction->failureReason,
                'payload' => $transaction->payload,
                'paid_at' => $transaction->status === PaymentStatus::Paid ? now() : null,
            ]);

            $order = Order::query()->whereKey($payment->order_id)->lockForUpdate()->first();

            if ($order->payment_status?->isPaid()) {
                return;
            }

            if ($transaction->status === PaymentStatus::Failed) {
                $order->update(['payment_status' => PaymentStatus::Failed]);

                return;
            }

            $order->forceFill(['payment_status' => PaymentStatus::Paid, 'paid_at' => now()])->save();
            $announce = $order;
        });

        if ($announce) {
            $this->announce($announce);
        }

        return $payment->refresh();
    }

    private function find(Store $store, GatewayTransaction $transaction): ?Payment
    {
        $payments = Payment::query()->where('store_id', $store->id);

        if ($transaction->reference) {
            return (clone $payments)->where('reference', $transaction->reference)->first()
                ?? ($transaction->gatewayOrderId ? $payments->where('gateway_order_id', $transaction->gatewayOrderId)->first() : null);
        }

        return $transaction->gatewayOrderId ? $payments->where('gateway_order_id', $transaction->gatewayOrderId)->first() : null;
    }

    private function announce(Order $order): void
    {
        $order->load(['store.vendor', 'affiliate', 'customer']);

        if ($order->status === OrderStatus::Cancelled) {
            $order->store->vendor->notify(new LatePaymentNotification($order));

            return;
        }

        $order->store->vendor->notify(new OrderPlacedNotification($order));
        $order->affiliate?->notify(new AffiliateCommissionNotification($order, AffiliateCommissionNotification::ORDER_PLACED));
        $order->customer?->notify(new CustomerOrderUpdateNotification($order, OrderStatus::Pending));
        $this->trackConversion->handle($order, ConversionEvent::PURCHASE);
    }
}
