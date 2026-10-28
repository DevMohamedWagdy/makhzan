<?php

namespace App\Listeners;

use Illuminate\Notifications\Events\NotificationSending;

/**
 * Only the notifications listed in config('makhzan.mail_notifications') are emailed; for any other the
 * mail channel is skipped while its other channels (the dashboard bell) still go out.
 */
class LimitMailNotifications
{
    /**
     * Returning false cancels this one channel for this one notification.
     */
    public function handle(NotificationSending $event): ?bool
    {
        if ($event->channel !== 'mail') {
            return null;
        }

        return in_array($event->notification::class, config('makhzan.mail_notifications', []), true) ? null : false;
    }
}
