<?php

namespace App\Support\Payments;

use App\Models\StorePaymentGateway;
use InvalidArgumentException;

/**
 * Resolves the gateway client for a store's payment account.
 */
class PaymentGateways
{
    public function for(StorePaymentGateway $account): PaymentGateway
    {
        return match ($account->gateway) {
            StorePaymentGateway::PAYMOB => new PaymobGateway($account),
            default => throw new InvalidArgumentException("Unknown payment gateway [{$account->gateway}]."),
        };
    }
}
