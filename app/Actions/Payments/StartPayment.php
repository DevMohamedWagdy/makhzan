<?php

namespace App\Actions\Payments;

use App\Enums\PaymentStatus;
use App\Models\Order;
use App\Models\Payment;
use App\Support\Payments\PaymentGatewayException;
use App\Support\Payments\PaymentGateways;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class StartPayment
{
    public function __construct(private PaymentGateways $gateways) {}

    /**
     * Opens a payment page for an online order that's still waiting to be paid. Each call
     * is a new attempt (a new Payment), so a customer whose card was declined can try again.
     *
     * @throws ValidationException
     */
    public function handle(Order $order): Payment
    {
        $account = $order->store->paymentGateway;

        if (! $order->canPay() || ! $account || $account->integrationIdFor($order->payment_method) === null) {
            throw ValidationException::withMessages(['payment_method' => __('payments.cannot_pay')]);
        }

        $payment = $order->payments()->create([
            'store_id' => $order->store_id,
            'gateway' => $account->gateway,
            'method' => $order->payment_method,
            'status' => PaymentStatus::Pending,
            'amount' => $order->total,
            'reference' => (string) Str::ulid(),
        ]);

        try {
            $session = $this->gateways->for($account)->startCheckout($payment, $order);
        } catch (PaymentGatewayException $exception) {
            report($exception);
            $payment->update(['status' => PaymentStatus::Failed, 'failure_reason' => mb_substr($exception->getMessage(), 0, 255)]);

            throw ValidationException::withMessages(['payment_method' => __('payments.start_failed')]);
        }

        $payment->update([
            'checkout_url' => $session->url,
            'gateway_intention_id' => $session->intentionId,
            'gateway_order_id' => $session->gatewayOrderId,
        ]);

        return $payment;
    }
}
