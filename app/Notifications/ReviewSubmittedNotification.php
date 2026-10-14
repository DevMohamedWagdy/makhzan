<?php

namespace App\Notifications;

use App\Models\ProductReview;
use Illuminate\Notifications\Notification;

/**
 * Dashboard alert that a customer reviewed a product and the review waits for approval.
 */
class ReviewSubmittedNotification extends Notification
{
    /**
     * Create a new notification instance.
     */
    public function __construct(public ProductReview $review) {}

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
        return 'review_submitted';
    }

    /**
     * @return array{review_id: int, product_id: int, product_name: string, customer_name: string, rating: int}
     */
    public function toArray(object $notifiable): array
    {
        return [
            'review_id' => $this->review->id,
            'product_id' => $this->review->product_id,
            'product_name' => $this->review->product->name,
            'customer_name' => $this->review->customer_name,
            'rating' => $this->review->rating,
        ];
    }
}
