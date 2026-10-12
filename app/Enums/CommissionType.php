<?php

namespace App\Enums;

enum CommissionType: string
{
    case Percentage = 'percentage';
    case Fixed = 'fixed';

    /**
     * Allowed range for a custom commission of this type.
     *
     * @return array{0: float, 1: float}
     */
    public function limits(): array
    {
        return match ($this) {
            self::Percentage => [0.5, 50],
            self::Fixed => [1, 5000],
        };
    }
}
