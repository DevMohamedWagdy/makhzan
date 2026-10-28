import { Link } from 'react-router-dom';
import { Logo } from '@/components/brand/Logo';
import { Icon } from '@/components/ui/Icon';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { t } from '@/i18n';
import { cn } from '@/lib/format';

/** What the brand panel says to each audience: a badge, a headline and three reasons to sign in. */
const PANELS = {
    merchant: {
        badge: t('لوحة تحكم التاجر'),
        title: t('كل تجارتك في مكان واحد'),
        text: t('المخزون والطلبات والمتجر الإلكتروني والمسوقين مترابطين في لوحة واحدة.'),
        points: [t('متجر إلكتروني جاهز باسمك في دقائق'), t('مخزون لحظي لكل مخازنك'), t('تقارير واضحة للمبيعات والأرباح')],
    },
    affiliate: {
        badge: t('بوابة المسوقين'),
        title: t('اربح من كل طلب تجلبه'),
        text: t('روابط إحالة خاصة بك، وعمولة تُضاف لرصيدك عند توصيل كل طلب.'),
        points: [t('روابط إحالة جاهزة للمشاركة'), t('متابعة لحظية لطلباتك وأرباحك'), t('طلب تحويل أرباحك في أي وقت')],
    },
    admin: {
        badge: t('إدارة المنصة'),
        title: t('لوحة تحكم فريق Sellygrow'),
        text: t('تابع المتاجر والطلبات والمسوقين والدعم الفني من مكان واحد.'),
        points: [t('إدارة المتاجر والحسابات'), t('متابعة الطلبات والمدفوعات'), t('تذاكر الدعم ورسائل التواصل')],
    },
};

/**
 * Login, sign-up and password pages. The form sits on a plain page (logo and toggles above it, legal links
 * below); from `lg` a night-navy brand panel beside it speaks to the audience (`merchant`, `affiliate` or
 * `admin`). `panel` overrides its title or text (e.g. the affiliate's store name); `wide` for longer forms.
 */
export function AuthLayout({ children, wide = false, audience = 'merchant', panel, homeTo = '/login' }) {
    const content = { ...PANELS[audience], ...panel };

    return (
        <div className="flex min-h-dvh bg-surface">
            <div className="relative flex min-w-0 flex-1 flex-col">
                <header className="flex h-16 items-center justify-between gap-2 px-4 sm:px-8">
                    {/* From lg the brand panel carries the logo. */}
                    <Link to={homeTo} aria-label={t('الصفحة الرئيسية لـ Sellygrow')} className="lg:invisible">
                        <Logo className="h-[18px]" />
                    </Link>
                    <div className="flex items-center gap-1">
                        <LanguageToggle />
                        <ThemeToggle />
                    </div>
                </header>

                <main className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-8">
                    <div className={cn('animate-pop w-full', wide ? 'max-w-xl' : 'max-w-[400px]')}>{children}</div>
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

            <BrandPanel content={content} />
        </div>
    );
}

/** The night-navy side of the auth pages (from `lg`): the logo on top, then the badge, headline, a short line and three checked points. */
function BrandPanel({ content }) {
    return (
        <aside className="relative isolate hidden w-[44%] max-w-[640px] shrink-0 flex-col justify-between overflow-hidden bg-brand p-10 text-white lg:flex xl:p-14" aria-hidden="true">
            <div className="mk-grid-texture absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_80%_70%_at_30%_20%,black,transparent_75%)]" />
            <div className="absolute -end-24 -bottom-32 -z-10 size-[420px] rounded-full bg-gold/20 blur-[110px]" />
            <div className="absolute -top-24 -start-24 -z-10 size-[360px] rounded-full bg-brand-accent/35 blur-[110px]" />

            <Logo className="h-[18px]" inverse />

            <div className="max-w-md">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-xs text-panel-text">
                    <span className="size-1.5 rounded-full bg-gold" />
                    {content.badge}
                </span>
                <h2 className="mt-5 text-3xl leading-tight font-bold xl:text-4xl xl:leading-tight">{content.title}</h2>
                <p className="mt-4 leading-relaxed text-panel-text">{content.text}</p>
                <ul className="mt-8 flex flex-col gap-3.5">
                    {content.points.map((point) => (
                        <li key={point} className="flex items-center gap-3 text-sm text-white/90">
                            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-gold/20 text-gold">
                                <Icon name="check" className="size-3.5" />
                            </span>
                            {point}
                        </li>
                    ))}
                </ul>
            </div>

            <span />
        </aside>
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
