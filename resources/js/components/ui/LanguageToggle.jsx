import { locale, setLocale, t } from '@/i18n';
import { cn } from '@/lib/format';

/** Switches between Arabic and English; the page reloads in the chosen language. */
export function LanguageToggle({ className }) {
    const next = locale === 'ar' ? 'en' : 'ar';
    const label = t('تغيير اللغة إلى الإنجليزية');

    return (
        <button
            type="button"
            onClick={() => setLocale(next)}
            aria-label={label}
            title={label}
            lang={next}
            className={cn('grid h-10 min-w-10 place-items-center rounded-xl border border-line bg-surface px-2.5 text-sm font-semibold text-ink-2 transition hover:border-line-strong hover:text-ink', className)}
        >
            {next === 'en' ? 'EN' : 'ع'}
        </button>
    );
}
