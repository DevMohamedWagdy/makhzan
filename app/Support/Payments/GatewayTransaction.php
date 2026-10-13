<?php

namespace App\Support\Payments;

use App\Enums\PaymentStatus;

/**
 * The outcome of a payment, as reported by a gateway callback. Status is Paid, Failed or Pending.
 */
final readonly class GatewayTransaction
{
    /**
     * @param  array<string, mixed>  $payload
     */
    public function __construct(
        public PaymentStatus $status,
        public ?string $reference,
        public ?string $gatewayOrderId,
        public ?string $transactionId,
        public float $amount,
        public ?string $failureReason,
        public array $payload,
    ) {}
}
