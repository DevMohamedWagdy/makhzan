<?php

namespace App\Support\Payments;

/**
 * A hosted payment page opened for one payment.
 */
final readonly class CheckoutSession
{
    public function __construct(
        public string $url,
        public string $intentionId,
        public ?string $gatewayOrderId,
    ) {}
}
