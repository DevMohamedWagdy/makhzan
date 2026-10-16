<?php

namespace App\Enums;

/**
 * Where an order came from: the online store, or a channel the vendor recorded it from by hand.
 */
enum OrderSource: string
{
    case Store = 'store';
    case Whatsapp = 'whatsapp';
    case Messenger = 'messenger';
    case Instagram = 'instagram';
    case Phone = 'phone';
    case Walkin = 'walkin';
    case Other = 'other';

    /**
     * Channels a vendor can record an order from in the dashboard.
     *
     * @return list<self>
     */
    public static function manual(): array
    {
        return array_values(array_filter(self::cases(), fn (self $source): bool => $source !== self::Store));
    }
}
