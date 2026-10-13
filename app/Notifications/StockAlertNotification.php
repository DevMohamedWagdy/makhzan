<?php

namespace App\Notifications;

use App\Models\ProductVariant;
use Illuminate\Notifications\Notification;

/**
 * Dashboard alert when a variant runs out or drops to its low-stock threshold.
 */
class StockAlertNotification extends Notification
{
    /**
     * Create a new notification instance.
     */
    public function __construct(public ProductVariant $variant, public int $stock, public int $threshold) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Stored in the notifications table's `type` column: stock_out or stock_low.
     */
    public function databaseType(object $notifiable): string
    {
        return $this->stock === 0 ? 'stock_out' : 'stock_low';
    }

    /**
     * @return array{product_id: int, variant_id: int, product_name: string, variant_title: string|null, stock: int, threshold: int}
     */
    public function toArray(object $notifiable): array
    {
        return [
            'product_id' => $this->variant->product_id,
            'variant_id' => $this->variant->id,
            'product_name' => $this->variant->product->name,
            'variant_title' => $this->variant->title() ?: null,
            'stock' => $this->stock,
            'threshold' => $this->threshold,
        ];
    }
}
