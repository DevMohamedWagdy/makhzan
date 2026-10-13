<?php

namespace App\Enums;

enum CommissionStatus: string
{
    /** The order didn't come through an affiliate. */
    case None = 'none';

    /** Credited to the affiliate once the order is delivered. */
    case Pending = 'pending';

    /** Added to the affiliate's earnings and pending balance. */
    case Earned = 'earned';

    /** The order was cancelled or returned; nothing is (or remains) owed. */
    case Cancelled = 'cancelled';
}
