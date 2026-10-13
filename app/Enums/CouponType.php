<?php

namespace App\Enums;

enum CouponType: string
{
    /** A percentage off the eligible products, optionally capped. */
    case Percentage = 'percentage';

    /** A fixed amount off the eligible products (never more than they cost). */
    case Fixed = 'fixed';

    /** The order ships free. */
    case FreeShipping = 'free_shipping';
}
