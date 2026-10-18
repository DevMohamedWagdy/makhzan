import { Link } from 'react-router-dom';
import { Logo } from '@/components/brand/Logo';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { t } from '@/i18n';
import { cn } from '@/lib/format';

/**
 * Login, sign-up and password pages: the logo centered above a single card, on a soft
 * background drawn from the brand's two colors.
 */
export function AuthLayout({ children, wide = false }) {
    return (
        <div className="relative flex min-h-dvh flex-col overflow-hidden">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                <div className="absolute inset-x-0 -top-48 mx-auto size-[34rem] rounded-full bg-primary/12 blur-3xl" />
                <div className="absolute -end-32 -bottom-40 size-[28rem] rounded-full bg-secondary/15 blur-3xl" />
                <div className="absolute -start-32 top-1/3 size-80 rounded-full bg-secondary/10 blur-3xl" />
            </div>

            <header className="relative flex items-center justify-end gap-2 px-4 py-5 sm:px-8">
                <LanguageToggle />
                <ThemeToggle />
            </header>

            <main className="relative flex flex-1 flex-col items-center justify-center px-4 pb-10">
                <Link to="/login" aria-label={t('الصفحة الرئيسية لمخزن')} className="mb-8">
                    <Logo className="h-7 sm:h-8" />
                </Link>
                <div className={cn('w-full rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-8', wide ? 'max-w-2xl' : 'max-w-md')}>{children}</div>
            </main>

            <footer className="relative flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-4 pb-6 text-xs text-muted">
                <span>{t('© {value} مخزن. جميع الحقوق محفوظة.', { value: new Date().getFullYear() })}</span>
                <Link to="/terms" className="hover:text-primary">
                    {t('الشروط والأحكام')}
                </Link>
                <Link to="/privacy" className="hover:text-primary">
                    {t('سياسة الخصوصية')}
                </Link>
                <a href="#" className="hover:text-primary">
                    {t('مركز المساعدة')}
                </a>
            </footer>
        </div>
    );
}

export function AuthHeading({ title, subtitle }) {
    return (
        <div className="mb-7 text-center">
            <h1 className="text-2xl font-bold text-ink">{title}</h1>
            {subtitle && <p className="mt-2 text-sm leading-relaxed text-muted">{subtitle}</p>}
        </div>
    );
}
