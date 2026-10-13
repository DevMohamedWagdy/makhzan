<?php

namespace App\Notifications;

use App\Models\Affiliate;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Tells an affiliate their account was approved, frozen, reactivated or (as an applicant)
 * rejected. Holds plain values only: a rejected applicant is deleted before the queued email
 * is sent, so it reaches them as an on-demand mail notification.
 */
class AffiliateAccountStatusNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public const APPROVED = 'approved';

    public const FROZEN = 'frozen';

    public const REACTIVATED = 'reactivated';

    public const REJECTED = 'rejected';

    /**
     * Create a new notification instance.
     *
     * @param  self::APPROVED|self::FROZEN|self::REACTIVATED|self::REJECTED  $event
     */
    public function __construct(
        public string $event,
        public string $affiliateName,
        public string $storeName,
        public string $storeSlug,
        public ?string $reason = null,
    ) {}

    /**
     * Builds the notification for an affiliate's current account.
     */
    public static function for(Affiliate $affiliate, string $event, ?string $reason = null): self
    {
        return new self($event, $affiliate->full_name, $affiliate->store->name, $affiliate->store->slug, $reason);
    }

    /**
     * Email when the affiliate has an address; the portal's notifications list for
     * accounts that still exist.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return array_values(array_filter([
            filled($notifiable->routeNotificationFor('mail', $this)) ? 'mail' : null,
            $notifiable instanceof Affiliate ? 'database' : null,
        ]));
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
        return "account_{$this->event}";
    }

    /**
     * Payload of the portal notification; the message is rendered in the reader's language
     * by NotificationResource::message().
     *
     * @return array{store_name: string, reason: string|null}
     */
    public function toArray(object $notifiable): array
    {
        return [
            'store_name' => $this->storeName,
            'reason' => $this->reason,
        ];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $key = "notifications.account_{$this->event}";

        return (new MailMessage)
            ->subject(__("{$key}.subject", ['store' => $this->storeName]))
            ->greeting(__('notifications.greeting', ['name' => $this->affiliateName]))
            ->line(__("{$key}.message", ['store' => $this->storeName]))
            ->when($this->reason, fn (MailMessage $message) => $message->line(__('notifications.reason', ['reason' => $this->reason])))
            ->when(in_array($this->event, [self::APPROVED, self::REACTIVATED], true), fn (MailMessage $message) => $message->action(
                __('notifications.open_portal'),
                config('makhzan.storefront_url')."/{$this->storeSlug}/affiliates/login",
            ));
    }
}
