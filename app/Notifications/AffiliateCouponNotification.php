<?php

namespace App\Notifications;

use App\Enums\CouponType;
use App\Models\Affiliate;
use App\Models\Coupon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Tells an affiliate the store gave them a discount code: orders using it are credited to them.
 */
class AffiliateCouponNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(public Coupon $coupon) {}

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
     * Stored in the notifications table's `type` column.
     */
    public function databaseType(object $notifiable): string
    {
        return 'coupon_assigned';
    }

    /**
     * @return array{coupon_id: int, code: string, type: string, value: float|null}
     */
    public function toArray(object $notifiable): array
    {
        return [
            'coupon_id' => $this->coupon->id,
            'code' => $this->coupon->code,
            'type' => $this->coupon->type->value,
            'value' => $this->coupon->value,
        ];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(Affiliate $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject(__('notifications.coupon_assigned.subject', ['code' => $this->coupon->code]))
            ->greeting(__('notifications.greeting', ['name' => $notifiable->full_name]))
            ->line(self::message($this->coupon->code, $this->coupon->type, $this->coupon->value))
            ->line(__('notifications.coupon_assigned.line'))
            ->action(__('notifications.open_portal'), config('makhzan.storefront_url')."/{$notifiable->store->slug}/affiliates/login");
    }

    /**
     * "You have a new discount code SARA10: 10% off" in the current language.
     */
    public static function message(string $code, CouponType|string $type, ?float $value): string
    {
        $type = $type instanceof CouponType ? $type : CouponType::from($type);

        return __("notifications.coupon_assigned.{$type->value}", [
            'code' => $code,
            'value' => rtrim(rtrim(number_format((float) $value, 2), '0'), '.'),
        ]);
    }
}
