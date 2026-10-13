<?php

namespace App\Enums;

enum PaymentMethod: string
{
    case Cod = 'cod';
    case Card = 'card';
    case Wallet = 'wallet';

    /**
     * Paid through the store's payment gateway before the order is confirmed.
     */
    public function isOnline(): bool
    {
        return $this !== self::Cod;
    }
}
