<?php

namespace App\Notifications;

use App\Models\Vendor;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * The 6-digit code a vendor enters to confirm their email before their first sign-in. Sent
 * right away rather than queued: they are waiting on the screen for it.
 */
class VendorVerificationCodeNotification extends Notification
{
    use Queueable;

    public function __construct(public string $code, public int $expiresInMinutes) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(Vendor $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject(__('notifications.vendor_verification_code.subject', ['code' => $this->code]))
            ->greeting(__('notifications.greeting', ['name' => $notifiable->full_name]))
            ->line(__('notifications.vendor_verification_code.intro'))
            ->line('# '.$this->code)
            ->line(__('notifications.vendor_verification_code.expiry', ['minutes' => $this->expiresInMinutes]))
            ->line(__('notifications.vendor_verification_code.ignore'));
    }
}
