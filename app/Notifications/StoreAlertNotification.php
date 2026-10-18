<?php

namespace App\Notifications;

use App\Models\Vendor;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Carbon;

/**
 * Alerts for the store owner about their account and store: the platform suspending or
 * reopening the store, the plan's product or staff limit coming close, a coupon running
 * out or expiring, and sign-ins from a new device or a password change.
 */
class StoreAlertNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public const STORE_SUSPENDED = 'store_suspended';

    public const STORE_REACTIVATED = 'store_reactivated';

    public const PLAN_LIMIT_NEAR = 'plan_limit_near';

    public const PLAN_LIMIT_REACHED = 'plan_limit_reached';

    public const COUPON_USED_UP = 'coupon_used_up';

    public const COUPON_EXPIRED = 'coupon_expired';

    public const NEW_SIGN_IN = 'new_sign_in';

    public const PASSWORD_CHANGED = 'password_changed';

    /**
     * Where each alert's email button leads in the dashboard.
     *
     * @var array<string, string>
     */
    private const ACTIONS = [
        self::STORE_SUSPENDED => '/dashboard/support',
        self::STORE_REACTIVATED => '/dashboard',
        self::PLAN_LIMIT_NEAR => '/dashboard/subscription',
        self::PLAN_LIMIT_REACHED => '/dashboard/subscription',
        self::COUPON_USED_UP => '/dashboard/coupons',
        self::COUPON_EXPIRED => '/dashboard/coupons',
        self::NEW_SIGN_IN => '/dashboard/settings?tab=account',
        self::PASSWORD_CHANGED => '/dashboard/settings?tab=account',
    ];

    /** Coupon alerts only reach the dashboard bell; the rest are emailed too. */
    private const BELL_ONLY = [self::COUPON_USED_UP, self::COUPON_EXPIRED];

    /**
     * @param  array<string, mixed>  $details  Stored with the notification and used to word it.
     */
    public function __construct(public string $event, public array $details = []) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return in_array($this->event, self::BELL_ONLY, true) ? ['database'] : ['mail', 'database'];
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
        return (new MailMessage)
            ->subject(__("notifications.{$this->event}.subject", self::params($this->event, $this->details)))
            ->greeting(__('notifications.greeting', ['name' => $notifiable->full_name]))
            ->line(self::message($this->event, $this->details))
            ->action(__('notifications.open_dashboard'), url(self::ACTIONS[$this->event]));
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return $this->details;
    }

    /**
     * The alert's text in the current language, for the email and the dashboard bell.
     *
     * @param  array<string, mixed>  $details
     */
    public static function message(string $event, array $details): string
    {
        return __("notifications.{$event}.message", self::params($event, $details));
    }

    /**
     * A short "Chrome on Windows" label for a browser's user agent.
     */
    public static function deviceLabel(?string $userAgent): string
    {
        $userAgent = (string) $userAgent;
        $browser = match (true) {
            str_contains($userAgent, 'Edg/') => 'Edge',
            str_contains($userAgent, 'OPR/') => 'Opera',
            str_contains($userAgent, 'Firefox/') => 'Firefox',
            str_contains($userAgent, 'Chrome/') => 'Chrome',
            str_contains($userAgent, 'Safari/') => 'Safari',
            default => null,
        };
        $system = match (true) {
            str_contains($userAgent, 'iPhone') || str_contains($userAgent, 'iPad') => 'iOS',
            str_contains($userAgent, 'Android') => 'Android',
            str_contains($userAgent, 'Windows') => 'Windows',
            str_contains($userAgent, 'Mac OS') => 'macOS',
            str_contains($userAgent, 'Linux') => 'Linux',
            default => null,
        };

        return $browser && $system ? __('notifications.device', ['browser' => $browser, 'system' => $system]) : ($browser ?? $system ?? __('notifications.unknown_device'));
    }

    /**
     * @param  array<string, mixed>  $details
     * @return array<string, string|int>
     */
    private static function params(string $event, array $details): array
    {
        return match ($event) {
            self::STORE_SUSPENDED => ['reason' => $details['reason'] ?? '—'],
            self::PLAN_LIMIT_NEAR, self::PLAN_LIMIT_REACHED => [
                'resource' => __("notifications.plan_resources.{$details['resource']}"),
                'used' => $details['used'],
                'limit' => $details['limit'],
            ],
            self::COUPON_USED_UP, self::COUPON_EXPIRED => ['code' => $details['code']],
            self::NEW_SIGN_IN, self::PASSWORD_CHANGED => [
                'device' => $details['device'] ?? __('notifications.unknown_device'),
                'ip' => $details['ip'] ?? '—',
                'time' => isset($details['at']) ? Carbon::parse($details['at'])->translatedFormat('j F Y، g:i a') : '',
            ],
            default => [],
        };
    }
}
