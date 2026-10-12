<?php

namespace App\Notifications;

use App\Models\Affiliate;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AffiliateResetPasswordNotification extends Notification implements ShouldQueue
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
     * Store-scoped SPA link: /{store-slug}/affiliates/reset-password?id=…&token=…
     */
    public function resetUrl(Affiliate $notifiable): string
    {
        return url("/{$notifiable->store->slug}/affiliates/reset-password").'?'.http_build_query([
            'id' => $notifiable->id,
            'token' => $this->token,
        ]);
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(Affiliate $notifiable): MailMessage
    {
        $minutes = config('makhzan.affiliates.password_reset_minutes');

        return (new MailMessage)
            ->subject(__('notifications.affiliate_reset_password.subject', ['store' => $notifiable->store->name]))
            ->greeting(__('notifications.greeting', ['name' => $notifiable->full_name]))
            ->line(__('notifications.affiliate_reset_password.intro', ['store' => $notifiable->store->name]))
            ->action(__('notifications.affiliate_reset_password.action'), $this->resetUrl($notifiable))
            ->line(__('notifications.affiliate_reset_password.expiry', ['minutes' => $minutes]))
            ->line(__('notifications.ignore_reset'));
    }
}
