<?php

namespace App\Support;

class PhoneNumber
{
    /**
     * Local Egyptian mobiles, Saudi mobiles, or international E.164-style numbers.
     */
    public const PATTERN = '/^(01[0125]\d{8}|05\d{8}|\+\d{10,15})$/';

    /**
     * Strips spaces, dashes and brackets, and converts Arabic-Indic digits to Latin.
     */
    public static function normalize(?string $value): string
    {
        $latinDigits = strtr((string) $value, [
            '٠' => '0', '١' => '1', '٢' => '2', '٣' => '3', '٤' => '4',
            '٥' => '5', '٦' => '6', '٧' => '7', '٨' => '8', '٩' => '9',
        ]);

        return preg_replace('/[\s\-()]/', '', $latinDigits) ?? '';
    }

    public static function isValid(?string $value): bool
    {
        return (bool) preg_match(self::PATTERN, self::normalize($value));
    }
}
