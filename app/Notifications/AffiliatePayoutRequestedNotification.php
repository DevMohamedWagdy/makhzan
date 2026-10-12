<?php

namespace App\Notifications;

use App\Models\AffiliatePayout;
use App\Models\Vendor;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AffiliatePayoutRequestedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(public AffiliatePayout $payout) {}

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
        return 'payout_requested';
    }

    /**
     * Payload of the dashboard notification.
     *
     * @return array{message: string, affiliate_id: int, affiliate_name: string, payout_id: int, amount: float}
     */
    public function toArray(object $notifiable): array
    {
        $affiliate = $this->payout->affiliate;

        return [
            'message' => "طلب {$affiliate->full_name} تحويل ".number_format($this->payout->amount, 2).' ج.م من رصيد عمولاته',
            'affiliate_id' => $affiliate->id,
            'affiliate_name' => $affiliate->full_name,
            'payout_id' => $this->payout->id,
            'amount' => $this->payout->amount,
        ];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(Vendor $notifiable): MailMessage
    {
        $affiliate = $this->payout->affiliate;
        $amount = number_format($this->payout->amount, 2);

        return (new MailMessage)
            ->subject("طلب تحويل عمولة من {$affiliate->full_name}")
            ->greeting('مرحباً '.$notifiable->full_name)
            ->line("طلب المسوق {$affiliate->full_name} تحويل {$amount} ج.م من رصيد عمولاته.")
            ->when($this->payout->request_note, fn (MailMessage $message) => $message->line('ملاحظة المسوق: '.$this->payout->request_note))
            ->action('مراجعة الطلب', url('/dashboard/payout-requests'))
            ->line('بعد التحويل، سجّل الدفعة من ملف المسوق ليُخصم المبلغ من رصيده.');
    }
}
