<?php

namespace App\Support\Payments;

use App\Models\Order;
use App\Models\Payment;
use Illuminate\Validation\ValidationException;

/**
 * An online payment provider, acting for one store's account. Resolved by PaymentGateways.
 */
interface PaymentGateway
{
    /**
     * Opens a hosted payment page for the payment.
     *
     * @throws PaymentGatewayException
     */
    public function startCheckout(Payment $payment, Order $order): CheckoutSession;

    /**
     * Reads a callback (the server-to-server webhook or the customer's redirect back). Null
     * for callbacks that aren't about a payment, such as refunds or saved cards.
     *
     * @param  array<string, mixed>  $data
     *
     * @throws InvalidCallbackSignature
     */
    public function parseCallback(array $data, ?string $signature): ?GatewayTransaction;

    /**
     * Sends money back to the customer. Returns the gateway's reference for the refund.
     *
     * @throws PaymentGatewayException
     */
    public function refund(Payment $payment, float $amount): string;

    /**
     * Checks the credentials against the gateway, for each payment method set up.
     *
     * @throws ValidationException
     */
    public function verify(): void;
}
