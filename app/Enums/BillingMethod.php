<?php

namespace App\Enums;

/**
 * How a vendor paid the platform for a subscription (transferred manually, then activated
 * by an admin).
 */
enum BillingMethod: string
{
    case VodafoneCash = 'vodafone_cash';
    case Instapay = 'instapay';
    case BankTransfer = 'bank_transfer';
    case Cash = 'cash';
}
