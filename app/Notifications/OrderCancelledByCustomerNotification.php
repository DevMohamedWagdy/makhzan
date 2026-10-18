<?php

namespace App\Notifications;

use App\Models\Order;
use App\Models\Vendor;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Tells the store owner (and staff who see orders) that a customer cancelled their order
 * from the storefront, so the vendor doesn't prepare or ship it.
 */
class OrderCancelledByCustomerNotification extends Notification implements ShouldQueue
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
        return 'order_cancelled';
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(Vendor $notifiable): MailMessage
    {
        $params = ['number' => $this->order->number, 'customer' => $this->order->recipient_name, 'total' => number_format($this->order->total, 2)];

        $mail = (new MailMessage)
            ->subject(__('notifications.order_cancelled.subject', $params))
            ->greeting(__('notifications.greeting', ['name' => $notifiable->full_name]))
            ->line(__('notifications.order_cancelled.line', $params));

        if ($this->order->cancel_reason) {
            $mail->line(__('notifications.order_cancelled.reason', ['reason' => $this->order->cancel_reason]));
        }

        return $mail->action(__('notifications.order_cancelled.action'), url('/dashboard/orders?order='.$this->order->id));
    }

    /**
     * Payload of the dashboard notification; the message is rendered in the reader's
     * language by NotificationResource.
     *
     * @return array{order_id: int, number: int, customer_name: string, total: float, reason: string|null}
     */
    public function toArray(object $notifiable): array
    {
        return [
            'order_id' => $this->order->id,
            'number' => $this->order->number,
            'customer_name' => $this->order->recipient_name,
            'total' => $this->order->total,
            'reason' => $this->order->cancel_reason,
        ];
    }
}
