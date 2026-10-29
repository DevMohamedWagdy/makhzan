import { Link } from 'react-router-dom';
import { Logo } from '@/components/brand/Logo';
import { Icon } from '@/components/ui/Icon';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { t } from '@/i18n';
import { cn } from '@/lib/format';

/** The badge over the form, naming who the page is for. */
const AUDIENCE_BADGES = {
    merchant: { icon: 'store', label: t('لوحة تحكم التاجر') },
    affiliate: { icon: 'megaphone', label: t('بوابة المسوقين') },
    admin: { icon: 'shield-check', label: t('إدارة المنصة') },
};

/**
 * Login, sign-up and password pages: the form on a card centered over a softly lit backdrop, the logo and toggles
 * above it and the legal links below. `audience` (`merchant`, `affiliate` or `admin`) sets the badge on the card;
 * `wide` for longer forms.
 */
export function AuthLayout({ children, wide = false, audience = 'merchant', homeTo = '/login' }) {
    return (
        <div className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-bg">
            <AuthBackdrop />

            <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-2 px-4 sm:h-20 sm:px-8">
                <Link to={homeTo} aria-label={t('الصفحة الرئيسية لـ Sellygrow')}>
                    <Logo className="h-[18px]" />
                </Link>
                <div className="flex items-center gap-1">
                    <LanguageToggle />
                    <ThemeToggle />
                </div>
            </header>

            <main className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-8 sm:py-12">
                <div className={cn('animate-pop w-full', wide ? 'max-w-2xl' : 'max-w-[460px]')}>
                    <div className="relative overflow-hidden rounded-3xl border border-line bg-surface p-6 shadow-raise sm:p-10">
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-primary via-gold to-primary" aria-hidden="true" />
                        <span className="mb-6 flex items-center gap-2.5 text-sm font-semibold text-primary">
                            <span className="grid size-9 place-items-center rounded-xl bg-primary-soft ring-1 ring-primary/15 ring-inset">
                                <Icon name={AUDIENCE_BADGES[audience].icon} className="size-[18px]" />
                            </span>
                            {AUDIENCE_BADGES[audience].label}
                        </span>
                        {children}
                    </div>
                </div>
            </main>

            <footer className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-4 pb-6 text-xs text-muted">
                <span>{t('© {value} Sellygrow. جميع الحقوق محفوظة.', { value: new Date().getFullYear() })}</span>
                <Link to="/terms" className="transition hover:text-ink">
                    {t('الشروط والأحكام')}
                </Link>
                <Link to="/privacy" className="transition hover:text-ink">
                    {t('سياسة الخصوصية')}
                </Link>
                <a href="#" className="transition hover:text-ink">
                    {t('مركز المساعدة')}
                </a>
            </footer>
        </div>
    );
}

/** Behind the card: a faint grid fading out from the top and two soft glows, in the theme's own colors. */
function AuthBackdrop() {
    return (
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
            <div className="absolute inset-0 bg-[linear-gradient(var(--color-line)_1px,transparent_1px),linear-gradient(90deg,var(--color-line)_1px,transparent_1px)] bg-[size:48px_48px] opacity-60 [mask-image:radial-gradient(ellipse_70%_55%_at_50%_0%,#000_10%,transparent_75%)]" />
            <div className="absolute -top-40 left-1/2 size-[520px] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />
            <div className="absolute -end-32 -bottom-40 size-[420px] rounded-full bg-gold/10 blur-[120px]" />
        </div>
    );
}

export function AuthHeading({ title, subtitle, icon }) {
    return (
        <div className="mb-8">
            {icon && <div className="mb-5">{icon}</div>}
            <h1 className="text-2xl font-semibold text-ink sm:text-[28px] sm:leading-10">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm leading-relaxed text-muted">{subtitle}</p>}
        </div>
    );
}
