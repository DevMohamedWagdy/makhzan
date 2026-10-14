<?php

namespace App\Enums;

enum ReviewStatus: string
{
    /** Waiting for the vendor; shoppers don't see it yet. */
    case Pending = 'pending';

    /** Shown on the product page and counted in its rating. */
    case Approved = 'approved';

    /** Hidden from shoppers. */
    case Rejected = 'rejected';
}
