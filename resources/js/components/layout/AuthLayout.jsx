import { Link } from 'react-router-dom';
import { Logo } from '@/components/brand/Logo';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { t } from '@/i18n';
import { cn } from '@/lib/format';

/**
 * Login, sign-up and password pages: the form centered on a calm paper column.
 */
export function AuthLayout({ children, wide = false }) {
    return (
        <div className="flex min-h-dvh">
            <div className="relative flex min-w-0 flex-1 flex-col">
                <header className="flex h-16 items-center justify-between gap-2 px-4 sm:px-8">
                    <Link to="/login" aria-label={t('الصفحة الرئيسية لـ Sellygrow')}>
                        <Logo className="h-6" />
                    </Link>
                    <div className="flex items-center gap-1">
                        <LanguageToggle />
                        <ThemeToggle />
                    </div>
                </header>

                <main className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-8">
                    <div className={cn('animate-pop w-full rounded-3xl border border-line bg-surface p-6 shadow-raise sm:p-9', wide ? 'max-w-2xl' : 'max-w-[440px]')}>{children}</div>
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
        </div>
    );
}

export function AuthHeading({ title, subtitle }) {
    return (
        <div className="mb-8">
            <h1 className="text-2xl font-semibold text-ink">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
        </div>
    );
}
