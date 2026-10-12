<?php

namespace App\Enums;

enum PayoutStatus: string
{
    /** The affiliate asked the vendor to transfer their commission; nothing paid yet. */
    case Requested = 'requested';

    /** The vendor transferred the money and the pending balance was reduced. */
    case Paid = 'paid';

    /** The vendor declined the affiliate's transfer request. */
    case Rejected = 'rejected';
}
