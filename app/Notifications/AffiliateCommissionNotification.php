<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Notifications\Notification;

/**
 * Portal-only updates about an order from the affiliate's links: placed (commission
 * expected), delivered (earned), cancelled before delivery, or returned after the
 * commission was credited (reversed). Customer details are never included.
 */
class AffiliateCommissionNotification extends Notification
{
    public const ORDER_PLACED = 'referral_order_placed';

    public const EARNED = 'commission_earned';

    public const CANCELLED = 'commission_cancelled';

    public const REVERSED = 'commission_reversed';

    /**
     * Create a new notification instance.
     *
     * @param  self::ORDER_PLACED|self::EARNED|self::CANCELLED|self::REVERSED  $event
     */
    public function __construct(public Order $order, public string $event) {}

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
        return $this->event;
    }

    /**
     * @return array{order_id: int, number: int, subtotal: float, commission: float}
     */
    public function toArray(object $notifiable): array
    {
        return [
            'order_id' => $this->order->id,
            'number' => $this->order->number,
            'subtotal' => $this->order->subtotal,
            'commission' => $this->order->commission_amount,
        ];
    }
}
