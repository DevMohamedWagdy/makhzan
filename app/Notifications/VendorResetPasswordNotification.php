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
            ->subject('إعادة تعيين كلمة المرور - مخزن')
            ->greeting('مرحباً '.$notifiable->full_name)
            ->line('وصلنا طلب لإعادة تعيين كلمة مرور حسابك على مخزن.')
            ->action('إعادة تعيين كلمة المرور', $this->resetUrl($notifiable))
            ->line("ينتهي هذا الرابط خلال {$expireMinutes} دقيقة.")
            ->line('إذا لم تطلب إعادة التعيين، تجاهل هذه الرسالة ولن يتغير شيء.');
    }
}
