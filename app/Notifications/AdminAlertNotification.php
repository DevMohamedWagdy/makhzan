<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Something the platform team should know about, shown in the admin panel's bell:
 * a new store, a subscription request, a trial that ended without subscribing, or a
 * merchant opening or replying to a support ticket.
 */
class AdminAlertNotification extends Notification
{
    use Queueable;

    public const STORE_REGISTERED = 'store_registered';

    public const SUBSCRIPTION_REQUESTED = 'subscription_requested';

    public const TRIAL_ENDED = 'trial_ended';

    public const TICKET_OPENED = 'ticket_opened';

    public const TICKET_VENDOR_REPLIED = 'ticket_vendor_replied';

    /** Which admins receive each alert (see Admin::notifyTeam()). */
    public const PERMISSIONS = [
        self::STORE_REGISTERED => 'stores.view',
        self::SUBSCRIPTION_REQUESTED => 'subscriptions.view',
        self::TRIAL_ENDED => 'stores.view',
        self::TICKET_OPENED => 'tickets.view',
        self::TICKET_VENDOR_REPLIED => 'tickets.view',
    ];

    /**
     * @param  array<string, mixed>  $details  store_id, store_name, plus event specifics
     */
    public function __construct(public string $event, public array $details) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function databaseType(object $notifiable): string
    {
        return $this->event;
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return $this->details;
    }
}
