import { Link } from 'react-router-dom';
import { Logo } from '@/components/brand/Logo';
import { Icon } from '@/components/ui/Icon';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { t } from '@/i18n';

const HIGHLIGHTS = [
    { icon: 'warehouse', title: t('مخزون تحت السيطرة'), text: t('تابع كميات منتجاتك وحركتها لحظة بلحظة في كل الفروع.') },
    { icon: 'users', title: t('جيش من المسوقين'), text: t('أضف مسوقين بعمولات مرنة وتابع مبيعات كل واحد منهم.') },
    { icon: 'truck', title: t('شحن وتحصيل أسهل'), text: t('اربط الطلبات بشركات الشحن وتابع التحصيل من مكان واحد.') },
];

export function AuthLayout({ children, wide = false }) {
    return (
        <div className="flex min-h-dvh">
            <main className="flex flex-1 flex-col px-4 py-6 sm:px-10">
                <header className="flex items-center justify-between">
                    <Link to="/login" aria-label={t('الصفحة الرئيسية لمخزن')}>
                        <Logo className="h-10" />
                    </Link>
                    <LanguageToggle />
                    <ThemeToggle />
                </header>
                <div className="flex flex-1 items-center justify-center py-10">
                    <div className={wide ? 'w-full max-w-2xl' : 'w-full max-w-md'}>{children}</div>
                </div>
                <footer className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted">
                    <span>{t('© {value} مخزن. جميع الحقوق محفوظة.', { value: new Date().getFullYear() })}</span>
                    <a href="#" className="hover:text-primary">
                        {t('الشروط والأحكام')}
                    </a>
                    <a href="#" className="hover:text-primary">
                        {t('سياسة الخصوصية')}
                    </a>
                    <a href="#" className="hover:text-primary">
                        {t('مركز المساعدة')}
                    </a>
                </footer>
            </main>

            <aside className="relative hidden w-[44%] max-w-[640px] overflow-hidden bg-gradient-to-br from-brand via-brand to-sky-600 lg:flex lg:flex-col lg:justify-between lg:p-12 dark:from-indigo-950 dark:via-slate-900 dark:to-sky-950">
                <svg className="pointer-events-none absolute inset-0 size-full opacity-[0.12]" aria-hidden="true">
                    <defs>
                        <pattern id="auth-grid" width="36" height="36" patternUnits="userSpaceOnUse">
                            <path d="M36 0H0v36" fill="none" stroke="#fff" strokeWidth="1" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#auth-grid)" />
                </svg>
                <div className="absolute -start-24 -top-24 size-80 rounded-full bg-sky-400/30 blur-3xl" />
                <div className="absolute -end-20 bottom-10 size-72 rounded-full bg-indigo-300/20 blur-3xl" />

                <div className="relative">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
                        <Icon name="sparkles" className="size-4" />
                        {t('منصة واحدة لإدارة تجارتك بالكامل')}
                    </span>
                    <h1 className="mt-6 text-4xl leading-[1.35] font-bold text-white">
                        {t('كل ما يحتاجه متجرك،')}
                        <br />
                        {t('في مخزن واحد.')}
                    </h1>
                    <p className="mt-4 max-w-md text-base leading-relaxed text-indigo-100">{t('المخزون، الطلبات، المسوقين والتقارير — نظام متكامل مصمم للتاجر العربي.')}</p>
                </div>

                <ul className="relative flex flex-col gap-3">
                    {HIGHLIGHTS.map((item) => (
                        <li key={item.title} className="flex items-start gap-4 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
                            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-brand">
                                <Icon name={item.icon} />
                            </span>
                            <span>
                                <span className="block text-sm font-semibold text-white">{item.title}</span>
                                <span className="mt-1 block text-xs leading-relaxed text-indigo-100">{item.text}</span>
                            </span>
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
            <h1 className="text-2xl font-bold text-ink sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-2 text-sm leading-relaxed text-muted">{subtitle}</p>}
        </div>
    );
}
