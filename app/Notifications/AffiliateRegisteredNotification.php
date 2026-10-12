<?php

namespace App\Notifications;

use App\Enums\AffiliateStatus;
use App\Models\Affiliate;
use App\Models\Vendor;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Sent to the vendor when someone joins through the store's public registration link.
 */
class AffiliateRegisteredNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(public Affiliate $affiliate) {}

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
        return 'affiliate_registered';
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(Vendor $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject(__('notifications.affiliate_registered.subject', ['affiliate' => $this->affiliate->full_name]))
            ->greeting(__('notifications.greeting', ['name' => $notifiable->full_name]))
            ->line(__($this->requiresApproval() ? 'notifications.affiliate_registered.pending' : 'notifications.affiliate_registered.active', ['affiliate' => $this->affiliate->full_name]))
            ->action(__($this->requiresApproval() ? 'notifications.affiliate_registered.review' : 'notifications.affiliate_registered.view'), url('/dashboard/affiliates?affiliate='.$this->affiliate->id));
    }

    /**
     * Payload of the dashboard notification; the message is rendered in the reader's
     * language by NotificationResource::message().
     *
     * @return array{affiliate_id: int, affiliate_name: string, requires_approval: bool}
     */
    public function toArray(object $notifiable): array
    {
        return [
            'affiliate_id' => $this->affiliate->id,
            'affiliate_name' => $this->affiliate->full_name,
            'requires_approval' => $this->requiresApproval(),
        ];
    }

    private function requiresApproval(): bool
    {
        return $this->affiliate->status === AffiliateStatus::Pending;
    }
}
