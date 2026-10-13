<?php

namespace App\Actions\Payments;

use App\Enums\CommissionStatus;
use App\Enums\CommissionType;
use App\Enums\PaymentStatus;
use App\Models\Affiliate;
use App\Models\Order;
use App\Models\Payment;
use App\Support\Payments\PaymentGatewayException;
use App\Support\Payments\PaymentGateways;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RefundPayment
{
    public function __construct(private PaymentGateways $gateways) {}

    /**
     * Sends part or all of an online payment back to the customer through the gateway. The
     * payment row stays locked while the gateway is called, so two refunds can't exceed it.
     *
     * The affiliate's commission shrinks with the refunded products: a percentage commission
     * is recalculated on what's left, a fixed one is dropped once the whole order is refunded.
     *
     * @throws ValidationException
     */
    public function handle(Order $order, float $amount, ?string $reason, string $actor): Order
    {
        $amount = round($amount, 2);

        return DB::transaction(function () use ($order, $amount, $reason, $actor): Order {
            $order = Order::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();
            $payment = $order->payments()
                ->whereIn('status', [PaymentStatus::Paid, PaymentStatus::PartiallyRefunded])
                ->whereColumn('refunded_amount', '<', 'amount')
                ->oldest('id')
                ->lockForUpdate()
                ->first();

            if (! $payment) {
                throw ValidationException::withMessages(['amount' => __('payments.nothing_to_refund')]);
            }

            if ($amount > $payment->refundable()) {
                throw ValidationException::withMessages(['amount' => __('payments.refund_too_much', ['amount' => number_format($payment->refundable(), 2)])]);
            }

            $account = $order->store->paymentGateway ?? throw ValidationException::withMessages(['amount' => __('payments.gateway_disconnected')]);

            try {
                $reference = $this->gateways->for($account)->refund($payment, $amount);
            } catch (PaymentGatewayException $exception) {
                report($exception);

                throw ValidationException::withMessages(['amount' => __('payments.refund_failed')]);
            }

            $payment->refunds()->create(['order_id' => $order->id, 'amount' => $amount, 'reason' => $reason, 'gateway_reference' => $reference, 'actor' => $actor]);
            $payment->refunded_amount = round($payment->refunded_amount + $amount, 2);
            $payment->status = $this->statusFor($payment->refunded_amount, $payment->amount);
            $payment->save();

            $order->refunded_amount = round($order->refunded_amount + $amount, 2);
            $order->payment_status = $this->statusFor($order->refunded_amount, $order->total);
            $this->reduceCommission($order);
            $order->save();

            return $order;
        });
    }

    private function statusFor(float $refunded, float $total): PaymentStatus
    {
        return $refunded >= $total - 0.009 ? PaymentStatus::Refunded : PaymentStatus::PartiallyRefunded;
    }

    /**
     * Refunds come off the products first, then the shipping.
     */
    private function reduceCommission(Order $order): void
    {
        if (! in_array($order->commission_status, [CommissionStatus::Pending, CommissionStatus::Earned], true)) {
            return;
        }

        $products = max(0.0, $order->subtotal - $order->discount - $order->refunded_amount);
        $commission = match ($order->commission_type) {
            CommissionType::Percentage => round($products * $order->commission_rate / 100, 2),
            default => $order->payment_status === PaymentStatus::Refunded ? 0.0 : $order->commission_amount,
        };
        $reduction = round($order->commission_amount - min($commission, $order->commission_amount), 2);

        if ($reduction <= 0) {
            return;
        }

        $order->commission_amount = round($order->commission_amount - $reduction, 2);

        if ($order->commission_status === CommissionStatus::Earned && $order->affiliate_id) {
            $affiliate = Affiliate::query()->whereKey($order->affiliate_id)->lockForUpdate()->first();
            $affiliate?->forceFill([
                'earned_commission' => round($affiliate->earned_commission - $reduction, 2),
                'pending_balance' => round($affiliate->pending_balance - $reduction, 2),
            ])->save();
        }
    }
}
