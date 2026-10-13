<?php

namespace App\Notifications;

use App\Enums\PayoutStatus;
use App\Models\Affiliate;
use App\Models\AffiliatePayout;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Tells an affiliate the vendor transferred commission to them, or declined their transfer request.
 */
class AffiliatePayoutProcessedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(public AffiliatePayout $payout) {}

    /**
     * @return array<int, string>
     */
    public function via(Affiliate $notifiable): array
    {
        return filled($notifiable->email) ? ['mail', 'database'] : ['database'];
    }

    /**
     * The portal notification is written immediately; only the email waits for the queue worker.
     *
     * @return array<string, string>
     */
    public function viaConnections(): array
    {
        return ['database' => 'sync'];
    }

    /**
     * Stored in the notifications table's `type` column: payout_paid or payout_rejected.
     */
    public function databaseType(object $notifiable): string
    {
        return $this->isPaid() ? 'payout_paid' : 'payout_rejected';
    }

    /**
     * @return array{payout_id: int, amount: float, reference: string|null, note: string|null}
     */
    public function toArray(object $notifiable): array
    {
        return [
            'payout_id' => $this->payout->id,
            'amount' => $this->payout->amount,
            'reference' => $this->payout->reference,
            'note' => $this->payout->note,
        ];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(Affiliate $notifiable): MailMessage
    {
        $key = $this->isPaid() ? 'notifications.payout_paid' : 'notifications.payout_rejected';
        $amount = number_format($this->payout->amount, 2);

        return (new MailMessage)
            ->subject(__("{$key}.subject", ['amount' => $amount]))
            ->greeting(__('notifications.greeting', ['name' => $notifiable->full_name]))
            ->line(__("{$key}.message", ['amount' => $amount]))
            ->when($this->payout->reference, fn (MailMessage $message) => $message->line(__('notifications.payout_paid.reference', ['reference' => $this->payout->reference])))
            ->when($this->payout->note, fn (MailMessage $message) => $message->line(__('notifications.store_note', ['note' => $this->payout->note])))
            ->action(__('notifications.open_portal'), config('makhzan.storefront_url')."/{$notifiable->store->slug}/affiliates/login");
    }

    private function isPaid(): bool
    {
        return $this->payout->status === PayoutStatus::Paid;
    }
}
