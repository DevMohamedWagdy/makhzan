<?php

namespace App\Support;

use App\Models\PlatformSetting;
use Illuminate\Mail\MailManager;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Throwable;

/**
 * Outgoing mail settings the admin panel manages (sender and SMTP server). Saved values override
 * config/mail.php and switch the platform to the SMTP mailer; until anything is saved the .env
 * values apply.
 */
class MailSettings
{
    public const KEY = 'mail';

    private const CACHE_KEY = 'platform-settings:mail';

    /** @var list<string> Everything the admin form saves. */
    public const FIELDS = ['from_address', 'from_name', 'smtp_host', 'smtp_port', 'smtp_username', 'smtp_password', 'smtp_encryption'];

    /** @var list<string> Credentials that are written but never sent back to the browser. */
    public const SECRETS = ['smtp_password'];

    /**
     * The saved settings, or an empty array when the admin hasn't saved any.
     *
     * @return array<string, mixed>
     */
    public static function saved(): array
    {
        try {
            return Cache::rememberForever(self::CACHE_KEY, fn (): array => PlatformSetting::valueOf(self::KEY));
        } catch (Throwable) {
            // The table doesn't exist yet (fresh install, mid-migration).
            return [];
        }
    }

    /**
     * Pushes the saved settings into the mail config. Runs when the mail manager is resolved,
     * before any mailer is built.
     */
    public static function apply(): void
    {
        $settings = self::saved();

        if ($settings === []) {
            return;
        }

        config(array_filter([
            'mail.default' => 'smtp',
            'mail.from.address' => $settings['from_address'] ?? null,
            'mail.from.name' => $settings['from_name'] ?? null,
            'mail.mailers.smtp.host' => $settings['smtp_host'] ?? null,
            'mail.mailers.smtp.port' => $settings['smtp_port'] ?? null,
            'mail.mailers.smtp.username' => $settings['smtp_username'] ?? null,
            'mail.mailers.smtp.password' => $settings['smtp_password'] ?? null,
            // "smtp" upgrades to TLS through STARTTLS when the server offers it (port 587).
            'mail.mailers.smtp.scheme' => isset($settings['smtp_encryption']) ? ($settings['smtp_encryption'] === 'ssl' ? 'smtps' : 'smtp') : null,
        ], fn (mixed $value): bool => filled($value)));
    }

    /**
     * Saves new settings. Blank secrets keep the stored ones, so the form never needs them back.
     * Keys outside FIELDS (e.g. the old Amazon SES credentials) are dropped.
     *
     * @param  array<string, mixed>  $values
     */
    public static function update(array $values): void
    {
        $current = Arr::only(PlatformSetting::valueOf(self::KEY), self::FIELDS);
        $values = Arr::only($values, self::FIELDS);

        foreach (self::SECRETS as $secret) {
            if (blank($values[$secret] ?? null)) {
                unset($values[$secret]);
            }
        }

        PlatformSetting::query()->updateOrCreate(['key' => self::KEY], ['value' => [...$current, ...$values]]);
        Cache::forget(self::CACHE_KEY);

        self::apply();
        app(MailManager::class)->forgetMailers();

        // Queue workers keep the old mailer in memory; restart them so they pick up the change.
        Artisan::call('queue:restart');
    }

    /**
     * What the admin form shows: the effective settings without the secrets themselves.
     *
     * @return array<string, mixed>
     */
    public static function forDisplay(): array
    {
        $saved = self::saved();

        return [
            'from_address' => $saved['from_address'] ?? config('mail.from.address'),
            'from_name' => $saved['from_name'] ?? config('mail.from.name'),
            'smtp_host' => $saved['smtp_host'] ?? config('mail.mailers.smtp.host'),
            'smtp_port' => (int) ($saved['smtp_port'] ?? config('mail.mailers.smtp.port')),
            'smtp_username' => $saved['smtp_username'] ?? config('mail.mailers.smtp.username'),
            'smtp_encryption' => $saved['smtp_encryption'] ?? (config('mail.mailers.smtp.scheme') === 'smtps' ? 'ssl' : 'tls'),
            'has_smtp_password' => filled($saved['smtp_password'] ?? config('mail.mailers.smtp.password')),
            'updated_at' => PlatformSetting::query()->where('key', self::KEY)->value('updated_at')?->toIso8601String(),
        ];
    }
}
