<?php

namespace App\Support;

use App\Models\PlatformSetting;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Cache;
use Throwable;

/**
 * The public website's admin-managed content: the contact channels in the footer (WhatsApp and
 * email) and the Terms and Privacy pages in Arabic and English. A legal page with no saved text
 * falls back to the built-in document in the SPA.
 */
class SiteSettings
{
    public const KEY = 'site';

    private const CACHE_KEY = 'platform-settings:site';

    /** @var list<string> The legal pages the admin can edit, as their URL paths. */
    public const DOCUMENTS = ['terms', 'privacy'];

    /** @var list<string> Everything the admin form saves. */
    public const FIELDS = ['whatsapp', 'contact_email', 'terms_ar', 'terms_en', 'privacy_ar', 'privacy_en'];

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
     * Saves new settings. A legal page's "last updated" date moves only when its text changes.
     *
     * @param  array<string, mixed>  $values
     */
    public static function update(array $values): void
    {
        $current = PlatformSetting::valueOf(self::KEY);
        $values = Arr::only($values, self::FIELDS);

        if (isset($values['whatsapp'])) {
            $values['whatsapp'] = preg_replace('/\D+/', '', $values['whatsapp']) ?: null;
        }

        foreach (self::DOCUMENTS as $document) {
            $changed = collect(['ar', 'en'])->contains(fn (string $locale): bool => ($values["{$document}_{$locale}"] ?? null) !== ($current["{$document}_{$locale}"] ?? null));

            if ($changed) {
                $values["{$document}_updated_at"] = now()->toIso8601String();
            }
        }

        PlatformSetting::query()->updateOrCreate(['key' => self::KEY], ['value' => [...$current, ...$values]]);
        Cache::forget(self::CACHE_KEY);
    }

    /**
     * The footer's contact channels; null when not set.
     *
     * @return array{whatsapp: ?string, contact_email: ?string}
     */
    public static function contact(): array
    {
        $saved = self::saved();

        return [
            'whatsapp' => $saved['whatsapp'] ?? null,
            'contact_email' => $saved['contact_email'] ?? null,
        ];
    }

    /**
     * A legal page's text in the given language. English pages don't borrow the Arabic text:
     * with no English version the SPA shows its built-in English document instead.
     *
     * @return array{content: ?string, updated_at: ?string}
     */
    public static function legal(string $document, string $locale): array
    {
        $saved = self::saved();
        $content = $saved[$document.'_'.($locale === 'en' ? 'en' : 'ar')] ?? null;

        return [
            'content' => filled($content) ? $content : null,
            'updated_at' => filled($content) ? ($saved["{$document}_updated_at"] ?? null) : null,
        ];
    }

    /**
     * What the admin form shows.
     *
     * @return array<string, mixed>
     */
    public static function forDisplay(): array
    {
        $saved = self::saved();

        return [
            ...array_fill_keys(self::FIELDS, null),
            ...Arr::only($saved, self::FIELDS),
            'terms_updated_at' => $saved['terms_updated_at'] ?? null,
            'privacy_updated_at' => $saved['privacy_updated_at'] ?? null,
        ];
    }
}
