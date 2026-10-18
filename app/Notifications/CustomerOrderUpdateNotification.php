<?php

namespace App\Notifications;

use App\Enums\OrderStatus;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Tells the shopper their order was received or moved to a new status. Sent by email only,
 * and only to customers with an email on file.
 */
class CustomerOrderUpdateNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * @param  OrderStatus  $status  The status the order just reached (Pending = just placed).
     */
    public function __construct(public Order $order, public OrderStatus $status) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return filled($notifiable->email) ? ['mail'] : [];
    }

    /**
     * The order's page in the storefront: /{store-slug}/account/orders/{number}.
     */
    public function orderUrl(): string
    {
        return url("/{$this->order->store->slug}/account/orders/{$this->order->number}");
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(Customer $notifiable): MailMessage
    {
        $store = $this->order->store;
        $key = 'notifications.customer_order.'.$this->status->value;
        $params = ['number' => $this->order->number, 'store' => $store->name, 'total' => number_format($this->order->total, 2)];

        $mail = (new MailMessage)
            ->subject(__("{$key}.subject", $params))
            ->greeting(__('notifications.greeting', ['name' => $notifiable->full_name]))
            ->line(__("{$key}.line", $params));

        if ($this->status === OrderStatus::Cancelled && filled($this->order->cancel_reason)) {
            $mail->line(__('notifications.customer_order.reason', ['reason' => $this->order->cancel_reason]));
        }

        $shipment = $this->status === OrderStatus::Shipped ? $this->order->shipment() : null;

        if ($shipment) {
            $mail->line(__('notifications.customer_order.tracking', ['carrier' => $shipment['carrier'], 'number' => $shipment['tracking_number']]));
        }

        if ($this->status === OrderStatus::Shipped && ! $this->order->payment_method?->isOnline()) {
            $mail->line(__('notifications.customer_order.cod_reminder', $params));
        }

        if ($this->status === OrderStatus::Pending) {
            $this->order->items->each(fn (OrderItem $item) => $mail->line(__('notifications.customer_order.item', [
                'name' => $item->product_name.($item->variant_title ? " ({$item->variant_title})" : ''),
                'quantity' => $item->quantity,
                'total' => number_format($item->line_total, 2),
            ])));
            $mail->line(__('notifications.customer_order.total', $params));
        }

        $mail->action(__('notifications.customer_order.action'), $this->orderUrl());

        if (filled($store->contact_email)) {
            $mail->replyTo($store->contact_email, $store->name);
        }

        return $mail;
    }
}
