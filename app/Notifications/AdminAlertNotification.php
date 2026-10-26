<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Something the platform team should know about, shown in the admin panel's bell:
 * a new store, a merchant opening or replying to a support ticket, or a landing-page contact message.
 */
class AdminAlertNotification extends Notification
{
    use Queueable;

    public const STORE_REGISTERED = 'store_registered';

    public const TICKET_OPENED = 'ticket_opened';

    public const TICKET_VENDOR_REPLIED = 'ticket_vendor_replied';

    public const CONTACT_MESSAGE = 'contact_message';

    /** Which admins receive each alert (see Admin::notifyTeam()). */
    public const PERMISSIONS = [
        self::STORE_REGISTERED => 'stores.view',
        self::TICKET_OPENED => 'tickets.view',
        self::TICKET_VENDOR_REPLIED => 'tickets.view',
        self::CONTACT_MESSAGE => 'messages.view',
    ];

    /**
     * @param  array<string, mixed>  $details  store_id, store_name (or the contact message's sender), plus event specifics
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
