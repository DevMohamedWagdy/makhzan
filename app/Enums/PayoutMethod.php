<?php

namespace App\Enums;

enum PayoutMethod: string
{
    case VodafoneCash = 'vodafone_cash';
    case InstaPay = 'instapay';
    case BankAccount = 'bank_account';
    case OrangeCash = 'orange_cash';
    case WeCash = 'we_cash';
    case EtisalatCash = 'etisalat_cash';

    public function requiresBankDetails(): bool
    {
        return $this === self::BankAccount;
    }

    /**
     * Resolves a payout method from its key or its Arabic label.
     */
    public static function fromInput(?string $value): ?self
    {
        $needle = mb_strtolower(trim((string) $value));

        return match ($needle) {
            'vodafone_cash', 'فودافون كاش' => self::VodafoneCash,
            'instapay', 'إنستاباي' => self::InstaPay,
            'bank_account', 'حساب بنكي' => self::BankAccount,
            'orange_cash', 'orange cash', 'اورانج كاش', 'أورانج كاش' => self::OrangeCash,
            'we_cash', 'we cash', 'we كاش', 'وي كاش' => self::WeCash,
            'etisalat_cash', 'etisalat cash', 'اتصالات كاش' => self::EtisalatCash,
            default => null,
        };
    }
}
