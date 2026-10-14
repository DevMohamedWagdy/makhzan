<?php

namespace App\Enums;

/**
 * Ad and analytics platforms a store can send its visits and orders to.
 */
enum TrackingProvider: string
{
    /** Meta (Facebook / Instagram) Pixel, plus the Conversions API from the server. */
    case Meta = 'meta';

    /** TikTok Pixel, plus the Events API from the server. */
    case Tiktok = 'tiktok';

    /** Google Analytics 4, plus the Measurement Protocol from the server. */
    case Google = 'google';

    /**
     * What the pixel / measurement ID looks like, to catch pasting the wrong value.
     */
    public function idPattern(): string
    {
        return match ($this) {
            self::Meta => '/^\d{10,20}$/',
            self::Tiktok => '/^[A-Z0-9]{15,25}$/',
            self::Google => '/^G-[A-Z0-9]{4,15}$/',
        };
    }
}
