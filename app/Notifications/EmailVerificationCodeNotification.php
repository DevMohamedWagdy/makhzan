<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * The 6-digit code a vendor or affiliate enters to confirm their email before signing in. Sent
 * right away rather than queued: they are waiting on the screen for it.
 */
class EmailVerificationCodeNotification extends Notification
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
    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject(__('notifications.email_verification_code.subject', ['code' => $this->code]))
            ->greeting(__('notifications.greeting', ['name' => $notifiable->full_name]))
            ->line(__('notifications.email_verification_code.intro'))
            ->line('# '.$this->code)
            ->line(__('notifications.email_verification_code.expiry', ['minutes' => $this->expiresInMinutes]))
            ->line(__('notifications.email_verification_code.ignore'));
    }
}
