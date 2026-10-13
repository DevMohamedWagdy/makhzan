<?php

namespace App\Notifications;

use App\Models\Order;
use App\Models\Vendor;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * A customer's online payment came through after their order had already been cancelled
 * (it expired, or they cancelled it): the vendor should refund it.
 */
class LatePaymentNotification extends Notification implements ShouldQueue
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
        return 'late_payment';
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(Vendor $notifiable): MailMessage
    {
        $params = ['number' => $this->order->number, 'total' => number_format($this->order->total, 2)];

        return (new MailMessage)
            ->subject(__('notifications.late_payment.subject', $params))
            ->greeting(__('notifications.greeting', ['name' => $notifiable->full_name]))
            ->line(__('notifications.late_payment.line', $params))
            ->action(__('notifications.order_placed.action'), url('/dashboard/orders?order='.$this->order->id));
    }

    /**
     * @return array{order_id: int, number: int, total: float}
     */
    public function toArray(object $notifiable): array
    {
        return [
            'order_id' => $this->order->id,
            'number' => $this->order->number,
            'total' => $this->order->total,
        ];
    }
}
