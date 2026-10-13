<?php

namespace App\Enums;

/**
 * Where an online payment stands. Cash-on-delivery orders have none.
 */
enum PaymentStatus: string
{
    case Pending = 'pending';
    case Paid = 'paid';
    case Failed = 'failed';
    case PartiallyRefunded = 'partially_refunded';
    case Refunded = 'refunded';

    /**
     * Money has been received (part of it may have been refunded since).
     */
    public function isPaid(): bool
    {
        return in_array($this, [self::Paid, self::PartiallyRefunded, self::Refunded], true);
    }
}
