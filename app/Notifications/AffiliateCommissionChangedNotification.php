<?php

namespace App\Notifications;

use App\Models\Affiliate;
use Illuminate\Notifications\Notification;

/**
 * Portal-only notice that the vendor changed the affiliate's commission (a custom rate or
 * back to the tier default). It applies to orders placed from now on.
 */
class AffiliateCommissionChangedNotification extends Notification
{
    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Stored in the notifications table's `type` column.
     */
    public function databaseType(object $notifiable): string
    {
        return 'commission_changed';
    }

    /**
     * @return array{type: string, value: float}
     */
    public function toArray(Affiliate $notifiable): array
    {
        $commission = $notifiable->effectiveCommission();

        return [
            'type' => $commission['type']->value,
            'value' => $commission['value'],
        ];
    }
}
