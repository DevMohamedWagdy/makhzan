<?php

namespace App\Notifications;

use App\Models\Order;
use App\Models\Vendor;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class OrderPlacedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(public Order $order) {}

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

    /**
     * Stored in the notifications table's `type` column.
     */
    public function databaseType(object $notifiable): string
    {
        return 'order_placed';
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(Vendor $notifiable): MailMessage
    {
        $params = ['number' => $this->order->number, 'customer' => $this->order->recipient_name, 'total' => number_format($this->order->total, 2)];
        $paidOnline = (bool) $this->order->payment_method?->isOnline();

        return (new MailMessage)
            ->subject(__('notifications.order_placed.subject', $params))
            ->greeting(__('notifications.greeting', ['name' => $notifiable->full_name]))
            ->line(__($paidOnline ? 'notifications.order_placed.line_paid' : 'notifications.order_placed.line', $params))
            ->action(__('notifications.order_placed.action'), url('/dashboard/orders?order='.$this->order->id));
    }

    /**
     * Payload of the dashboard notification; the message is rendered in the reader's
     * language by NotificationResource.
     *
     * @return array{order_id: int, number: int, customer_name: string, total: float, affiliate_name: string|null, paid_online: bool}
     */
    public function toArray(object $notifiable): array
    {
        return [
            'order_id' => $this->order->id,
            'number' => $this->order->number,
            'customer_name' => $this->order->recipient_name,
            'total' => $this->order->total,
            'affiliate_name' => $this->order->affiliate?->full_name,
            'paid_online' => (bool) $this->order->payment_method?->isOnline(),
        ];
    }
}
