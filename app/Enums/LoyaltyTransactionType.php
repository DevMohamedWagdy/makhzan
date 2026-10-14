<?php

namespace App\Enums;

/**
 * Why a customer's points balance changed.
 */
enum LoyaltyTransactionType: string
{
    /** Points for a delivered order. */
    case Earned = 'earned';

    /** Points spent as a discount on an order. */
    case Redeemed = 'redeemed';

    /** Spent points given back because their order was cancelled or returned. */
    case Refunded = 'refunded';

    /** Earned points taken back because their order was returned. */
    case Reversed = 'reversed';

    /** Added or removed by the store by hand (a gift, a correction). */
    case Adjusted = 'adjusted';
}
