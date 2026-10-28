<?php

namespace App\Notifications;

use App\Models\Customer;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * The password reset link. Sent during the request rather than queued: someone is waiting on that
 * screen, and the link shouldn't depend on a queue worker running.
 */
class CustomerResetPasswordNotification extends Notification
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
     * Store-scoped SPA link: /{store-slug}/account/reset-password?id=…&token=…
     */
    public function resetUrl(Customer $notifiable): string
    {
        return url("/{$notifiable->store->slug}/account/reset-password").'?'.http_build_query([
            'id' => $notifiable->id,
            'token' => $this->token,
        ]);
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(Customer $notifiable): MailMessage
    {
        $minutes = config('makhzan.customers.password_reset_minutes');

        return (new MailMessage)
            ->subject(__('notifications.customer_reset_password.subject', ['store' => $notifiable->store->name]))
            ->greeting(__('notifications.greeting', ['name' => $notifiable->full_name]))
            ->line(__('notifications.customer_reset_password.intro', ['store' => $notifiable->store->name]))
            ->action(__('notifications.customer_reset_password.action'), $this->resetUrl($notifiable))
            ->line(__('notifications.customer_reset_password.expiry', ['minutes' => $minutes]))
            ->line(__('notifications.ignore_reset'));
    }
}
