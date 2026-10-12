<?php

namespace App\Enums;

enum AffiliateTier: string
{
    case New = 'new';
    case General = 'general';
    case Vip = 'vip';

    /**
     * Commission percentage applied when the affiliate has no custom override.
     */
    public function defaultCommission(): float
    {
        return match ($this) {
            self::New => 5,
            self::General => 8,
            self::Vip => 12,
        };
    }

    /**
     * Resolves a tier from its key or its Arabic label (as vendors type it in import sheets).
     */
    public static function fromInput(?string $value): ?self
    {
        $needle = mb_strtolower(trim((string) $value));

        return match ($needle) {
            'new', 'مسوق جديد' => self::New,
            'general', 'مسوق عام' => self::General,
            'vip', 'مسوق vip' => self::Vip,
            default => null,
        };
    }
}
