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
            className={cn('grid h-9 min-w-9 place-items-center rounded-lg px-2 text-[13px] font-semibold text-ink-2 transition hover:bg-surface-3 hover:text-ink', className)}
        >
            {next === 'en' ? 'EN' : 'ع'}
        </button>
    );
}
