<?php

namespace App\Notifications;

use App\Models\Vendor;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class VendorResetPasswordNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(public string $token) {}

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
     * Link to the SPA's reset screen; the token is only valid for the broker's expiry window.
     */
    public function resetUrl(Vendor $notifiable): string
    {
        return url('/reset-password').'?'.http_build_query([
            'token' => $this->token,
            'email' => $notifiable->getEmailForPasswordReset(),
        ]);
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(Vendor $notifiable): MailMessage
    {
        $expireMinutes = config('auth.passwords.vendors.expire');

        return (new MailMessage)
            ->subject(__('notifications.vendor_reset_password.subject'))
            ->greeting(__('notifications.greeting', ['name' => $notifiable->full_name]))
            ->line(__('notifications.vendor_reset_password.intro'))
            ->action(__('notifications.vendor_reset_password.action'), $this->resetUrl($notifiable))
            ->line(__('notifications.vendor_reset_password.expiry', ['minutes' => $expireMinutes]))
            ->line(__('notifications.ignore_reset'));
    }
}
