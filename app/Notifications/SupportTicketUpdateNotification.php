<?php

namespace App\Notifications;

use App\Models\SupportTicket;
use App\Models\Vendor;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Tells a store owner the platform team replied to, closed or reopened one of the store's
 * support tickets.
 */
class SupportTicketUpdateNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public const REPLIED = 'ticket_replied';

    public const CLOSED = 'ticket_closed';

    public const REOPENED = 'ticket_reopened';

    public function __construct(public string $event, public SupportTicket $ticket) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    /**
     * The dashboard bell is written immediately; only the email waits for the queue worker.
     *
     * @return array<string, string>
     */
    public function viaConnections(): array
    {
        return ['database' => 'sync'];
    }

    public function databaseType(object $notifiable): string
    {
        return $this->event;
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(Vendor $notifiable): MailMessage
    {
        $params = ['subject' => $this->ticket->subject];

        return (new MailMessage)
            ->subject(__("notifications.{$this->event}.subject", $params))
            ->greeting(__('notifications.greeting', ['name' => $notifiable->full_name]))
            ->line(__("notifications.{$this->event}.message", $params))
            ->action(__('notifications.ticket_action'), url("/dashboard/support/{$this->ticket->id}"));
    }

    /**
     * @return array{ticket_id: int, subject: string}
     */
    public function toArray(object $notifiable): array
    {
        return [
            'ticket_id' => $this->ticket->id,
            'subject' => $this->ticket->subject,
        ];
    }
}
