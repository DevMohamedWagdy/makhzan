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
            ->subject('إعادة تعيين كلمة المرور - '.$notifiable->store->name)
            ->greeting('مرحباً '.$notifiable->full_name)
            ->line('وصلنا طلب لإعادة تعيين كلمة مرور حسابك كمسوق في '.$notifiable->store->name.'.')
            ->action('تعيين كلمة مرور جديدة', $this->resetUrl($notifiable))
            ->line("ينتهي هذا الرابط خلال {$minutes} دقيقة ويمكن استخدامه مرة واحدة فقط.")
            ->line('إذا لم تطلب إعادة التعيين، تجاهل هذه الرسالة ولن يتغير شيء.');
    }
}
