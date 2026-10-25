import { Link } from 'react-router-dom';
import { Logo, LogoMark } from '@/components/brand/Logo';
import { Icon } from '@/components/ui/Icon';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { t } from '@/i18n';
import { cn } from '@/lib/format';

/**
 * Login, sign-up and password pages: the form on a calm paper column, beside an Ink brand panel
 * (wide screens only) that carries the product promise. On phones the form stands alone.
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

            <aside aria-hidden="true" className={cn('relative hidden shrink-0 overflow-hidden bg-panel text-white lg:flex lg:flex-col lg:justify-between', wide ? 'w-[38%]' : 'w-[46%]', 'max-w-[680px] p-12 xl:p-16')}>
                <div className="mk-grid-texture absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]" />
                <div className="absolute -end-24 -top-24 size-[420px] rounded-full bg-sprout/10 blur-3xl" />
                <div className="absolute -bottom-40 -start-24 size-[380px] rounded-full bg-brand-green/20 blur-3xl" />
                <LogoMark className="relative size-10 text-sprout" />
                <div className="relative">
                    <p className="mk-overline text-sprout">{t('منصة واحدة لإدارة تجارتك بالكامل')}</p>
                    <p className="mt-5 text-[34px] leading-[1.25] font-semibold text-white xl:text-[40px]">
                        {t('كل ما يحتاجه متجرك،')}
                        <br />
                        <span className="text-sprout">{t('في منصة واحدة.')}</span>
                    </p>
                    <p className="mt-5 max-w-md text-[15px] leading-7 text-panel-text">{t('المخزون، الطلبات، المسوقين والتقارير — نظام متكامل مصمم للتاجر العربي.')}</p>
                </div>
                <ul className="relative flex flex-col divide-y divide-panel-line border-y border-panel-line">
                    {[
                        { icon: 'truck', text: t('ربط مع شركات الشحن') },
                        { icon: 'users', text: t('نظام مسوّقين بالعمولة') },
                        { icon: 'bar-chart', text: t('تقارير لحظية لمبيعاتك') },
                    ].map((item) => (
                        <li key={item.icon} className="flex items-center gap-3 py-3.5 text-sm text-panel-text">
                            <span className="grid size-8 place-items-center rounded-lg bg-white/5 text-sprout">
                                <Icon name={item.icon} className="size-4" />
                            </span>
                            {item.text}
                        </li>
                    ))}
                </ul>
            </aside>
        </div>
    );
}

export function AuthHeading({ title, subtitle }) {
    return (
        <div className="mb-8">
            <h1 className="text-[24px] leading-9 font-semibold text-ink">{title}</h1>
            {subtitle && <p className="mt-1.5 text-[13.5px] leading-6 text-muted">{subtitle}</p>}
        </div>
    );
}
