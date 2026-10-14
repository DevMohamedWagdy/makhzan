<?php

namespace App\Notifications;

use App\Models\Vendor;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Carbon;

/**
 * Tells a store owner their plan was activated, their request was declined, or their plan
 * is about to expire.
 */
class SubscriptionUpdateNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public const ACTIVATED = 'subscription_activated';

    public const REJECTED = 'subscription_rejected';

    public const EXPIRING = 'subscription_expiring';

    public const TRIAL_ENDING = 'trial_ending';

    public function __construct(public string $event, public string $planName, public ?Carbon $endsAt = null, public ?string $note = null) {}

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

    public function databaseType(object $notifiable): string
    {
        return $this->event;
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(Vendor $notifiable): MailMessage
    {
        $params = $this->params();

        $mail = (new MailMessage)
            ->subject(__("notifications.{$this->event}.subject", $params))
            ->greeting(__('notifications.greeting', ['name' => $notifiable->full_name]))
            ->line(__("notifications.{$this->event}.message", $params));

        if ($this->note) {
            $mail->line(__('notifications.subscription_note', ['note' => $this->note]));
        }

        return $mail->action(__('notifications.subscription_action'), url('/dashboard/subscription'));
    }

    /**
     * @return array{plan_name: string, ends_at: string|null, note: string|null}
     */
    public function toArray(object $notifiable): array
    {
        return [
            'plan_name' => $this->planName,
            'ends_at' => $this->endsAt?->toIso8601String(),
            'note' => $this->note,
        ];
    }

    /**
     * @return array{plan: string, date: string}
     */
    private function params(): array
    {
        return ['plan' => $this->planName, 'date' => $this->endsAt?->translatedFormat('j F Y') ?? ''];
    }
}
