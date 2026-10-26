import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo, LogoMark } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuth } from '@/context/AuthContext';
import { t } from '@/i18n';
import { cn } from '@/lib/format';
import { SiteFooter } from '@/pages/landing/SiteFooter';

const NAV_LINKS = [
    { href: '#features', label: t('المميزات') },
    { href: '#how-it-works', label: t('كيف يعمل') },
    { href: '#storefront', label: t('المتجر الإلكتروني') },
];

const FEATURES = [
    { icon: 'warehouse', title: t('مخزون متعدد الفروع'), text: t('تابع الكميات في كل مخزن، وانقل البضاعة بين الفروع مع سجل كامل لكل حركة.') },
    { icon: 'shopping-bag', title: t('إدارة الطلبات'), text: t('استقبل الطلبات من متجرك وتابع حالتها من التأكيد حتى التسليم في شاشة واحدة.') },
    { icon: 'truck', title: t('شحن وتحصيل'), text: t('اربط الطلبات بشركات الشحن وتابع مبالغ التحصيل بدون جداول يدوية.') },
    { icon: 'users', title: t('برنامج المسوقين'), text: t('روابط إحالة وعمولات مرنة ولوحة خاصة لكل مسوق يتابع منها أرباحه.') },
    { icon: 'gift', title: t('كوبونات وولاء'), text: t('كوبونات خصم ونقاط ولاء ومستويات للعملاء تعيدهم للشراء مرة بعد مرة.') },
    { icon: 'bar-chart', title: t('تقارير واضحة'), text: t('المبيعات والأرباح وأفضل المنتجات أداءً، بأرقام تفهمها من أول نظرة.') },
    { icon: 'file-text', title: t('المشتريات والموردين'), text: t('أوامر شراء واستلام بضاعة من الموردين تحدّث المخزون تلقائياً.') },
    { icon: 'shield-check', title: t('فريق وصلاحيات'), text: t('أضف موظفيك وحدد لكل واحد الأقسام التي يراها، مع سجل لكل نشاط.') },
];

const STEPS = [
    { title: t('أنشئ حسابك'), text: t('سجّل في دقيقة وأدخل بيانات متجرك الأساسية.') },
    { title: t('أضف منتجاتك'), text: t('ارفع المنتجات والأقسام وحدد الكميات في كل مخزن.') },
    { title: t('ابدأ البيع'), text: t('شارك رابط متجرك واستقبل الطلبات وتابعها من لوحة التحكم.') },
];

const STOREFRONT_POINTS = [t('رابط خاص لمتجرك أو دومين باسمك'), t('سلة ودفع إلكتروني وتتبع للطلبات'), t('حسابات للعملاء مع المفضلة ونقاط الولاء'), t('يعمل بالعربية والإنجليزية على كل الأجهزة')];

const STATS = [
    { value: '+10', label: t('وحدات متكاملة') },
    { value: '24/7', label: t('متجرك يعمل دائماً') },
    { value: '2', label: t('لغتان: عربي وإنجليزي') },
    { value: '100%', label: t('سحابي بدون تثبيت') },
];

const HERO_PROOF = [
    { icon: 'truck', text: t('ربط مع شركات الشحن') },
    { icon: 'users', text: t('نظام مسوّقين بالعمولة') },
    { icon: 'bar-chart', text: t('تقارير لحظية لمبيعاتك') },
];

const CHART_BARS =[42, 58, 46, 70, 62, 84, 76];

export function LandingPage() {
    const { isAuthenticated } = useAuth();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    // Icon mirrors arrows in English itself, so the Arabic drawing is always the one to ask for.
    const arrow = 'arrow-left';

    useEffect(() => {
        const onScroll = () => setIsScrolled(window.scrollY > 8);

        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });

        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const primaryAction = isAuthenticated ? (
        <Button to="/dashboard" variant="brand" size="xl" iconEnd={arrow}>
            {t('الذهاب إلى لوحة التحكم')}
        </Button>
    ) : (
        <Button to="/register" variant="brand" size="xl" iconEnd={arrow}>
            {t('ابدأ مجاناً')}
        </Button>
    );

    return (
        <div className="min-h-dvh scroll-smooth bg-bg">
            <header className={cn('sticky top-0 z-30 transition', isScrolled || isMenuOpen ? 'border-b border-line bg-surface/85 backdrop-blur-md' : 'border-b border-transparent')}>
                <div className="mx-auto flex h-18 max-w-6xl items-center gap-6 px-4 sm:px-6">
                    <Link to="/" aria-label={t('الصفحة الرئيسية لـ Sellygrow')}>
                        <Logo className="h-5" />
                    </Link>
                    <nav className="hidden items-center gap-1 md:flex" aria-label={t('القائمة الرئيسية')}>
                        {NAV_LINKS.map((link) => (
                            <a key={link.href} href={link.href} className="rounded-lg px-3 py-2 text-sm text-ink-2 transition hover:bg-surface-3 hover:text-ink">
                                {link.label}
                            </a>
                        ))}
                    </nav>
                    <div className="ms-auto flex items-center gap-2">
                        <LanguageToggle className="hidden sm:grid" />
                        <ThemeToggle />
                        {isAuthenticated ? (
                            <Button to="/dashboard">{t('لوحة التحكم')}</Button>
                        ) : (
                            <>
                                <span className="hidden sm:block">
                                    <Button to="/login" variant="ghost">
                                        {t('تسجيل الدخول')}
                                    </Button>
                                </span>
                                <Button to="/register">{t('ابدأ مجاناً')}</Button>
                            </>
                        )}
                        <button
                            type="button"
                            onClick={() => setIsMenuOpen((open) => !open)}
                            aria-expanded={isMenuOpen}
                            aria-controls="landing-mobile-menu"
                            aria-label={isMenuOpen ? t('إغلاق القائمة') : t('فتح القائمة')}
                            className="grid size-10 place-items-center rounded-xl border border-line bg-surface text-ink-2 transition hover:border-line-strong hover:text-ink md:hidden"
                        >
                            <Icon name={isMenuOpen ? 'x' : 'menu'} />
                        </button>
                    </div>
                </div>
                {isMenuOpen && (
                    <nav id="landing-mobile-menu" className="border-t border-line px-4 pt-2 pb-4 md:hidden" aria-label={t('القائمة الرئيسية')}>
                        {NAV_LINKS.map((link) => (
                            <a key={link.href} href={link.href} onClick={() => setIsMenuOpen(false)} className="block rounded-lg px-3 py-3 text-sm text-ink-2 transition hover:bg-surface-3 hover:text-ink">
                                {link.label}
                            </a>
                        ))}
                        <div className="mt-2 flex items-center gap-2 border-t border-line pt-4">
                            {isAuthenticated ? (
                                <Button to="/dashboard" variant="secondary" className="flex-1">
                                    {t('لوحة التحكم')}
                                </Button>
                            ) : (
                                <Button to="/login" variant="secondary" icon="log-in" className="flex-1">
                                    {t('تسجيل الدخول')}
                                </Button>
                            )}
                            <LanguageToggle />
                        </div>
                    </nav>
                )}
            </header>

            <main>
                {/* Hero on Ink (design system "Hero"): one logo-green CTA, proof chips, then the product frame overlapping the next section. */}
                <section className="relative bg-brand text-white">
                    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
                        <div className="mk-grid-texture absolute inset-0 [mask-image:radial-gradient(ellipse_60%_55%_at_50%_0%,black,transparent)]" />
                        <div className="absolute -top-40 start-1/2 h-[420px] w-[640px] -translate-x-1/2 rounded-full bg-primary/40 blur-3xl rtl:translate-x-1/2" />
                    </div>

                    <div className="relative mx-auto max-w-6xl px-4 pt-16 text-center sm:px-6 sm:pt-24">
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-white/85 backdrop-blur">
                            <Icon name="sparkles" className="size-4 text-brand-green" />
                            {t('منصة واحدة لإدارة تجارتك بالكامل')}
                        </span>
                        <h1 className="mx-auto mt-7 max-w-3xl text-4xl font-semibold text-balance sm:text-5xl">
                            {t('كل ما يحتاجه متجرك،')} <span className="text-brand-green">{t('في منصة واحدة.')}</span>
                        </h1>
                        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">
                            {t('المخزون، الطلبات، المسوقين والتقارير — نظام متكامل مصمم للتاجر العربي.')}
                        </p>
                        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                            {primaryAction}
                            <Button variant="outline-light" size="xl" onClick={scrollToHash('#features')}>
                                {t('اكتشف المميزات')}
                            </Button>
                        </div>
                        <p className="mt-4 text-xs text-white/60">{t('بدون بطاقة ائتمان — جاهز للعمل خلال دقائق.')}</p>

                        <ul className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-4">
                            {HERO_PROOF.map((proof) => (
                                <li key={proof.text} className="flex items-center gap-3 text-sm text-white/85">
                                    <span className="grid size-9 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-brand-green">
                                        <Icon name={proof.icon} className="size-5" />
                                    </span>
                                    {proof.text}
                                </li>
                            ))}
                        </ul>

                        <div className="relative z-10 -mb-28 sm:-mb-40">
                            <DashboardPreview />
                        </div>
                    </div>
                </section>

                <section className="border-b border-line bg-surface">
                    <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-y-8 px-4 pt-36 pb-12 sm:px-6 sm:pt-48 md:grid-cols-4 md:divide-x md:divide-line">
                        {STATS.map((stat) => (
                            <div key={stat.label} className="text-center">
                                <dt className="sr-only">{stat.label}</dt>
                                <dd className="ltr mk-num text-3xl font-semibold text-ink">{stat.value}</dd>
                                <dd className="mt-1 text-sm text-muted">{stat.label}</dd>
                            </div>
                        ))}
                    </dl>
                </section>

                <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6 sm:py-24">
                    <SectionHeading eyebrow={t('المميزات')} title={t('أدوات حقيقية لتاجر حقيقي')} subtitle={t('كل وحدة مصممة لتوفر وقتك وتقلل الأخطاء، وكلها مترابطة في نظام واحد.')} />
                    <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {FEATURES.map((feature) => (
                            <article key={feature.title} className="mk-card mk-card-link group p-6">
                                <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-brand-green ring-1 ring-primary/10 ring-inset transition group-hover:bg-brand-green group-hover:text-brand">
                                    <Icon name={feature.icon} />
                                </span>
                                <h3 className="mt-5 text-base font-semibold text-ink">{feature.title}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-muted">{feature.text}</p>
                            </article>
                        ))}
                    </div>
                </section>

                <section id="how-it-works" className="scroll-mt-20 bg-surface py-20 sm:py-24">
                    <div className="mx-auto max-w-6xl px-4 sm:px-6">
                        <SectionHeading eyebrow={t('كيف يعمل')} title={t('ابدأ في ثلاث خطوات')} />
                        <ol className="mt-12 grid gap-6 md:grid-cols-3">
                            {STEPS.map((step, index) => (
                                <li key={step.title} className="relative rounded-2xl border border-line bg-bg p-6">
                                    <span className="ltr mk-num grid size-10 place-items-center rounded-xl bg-panel text-sm font-semibold text-brand-green">{String(index + 1).padStart(2, '0')}</span>
                                    <h3 className="mt-5 text-lg font-semibold text-ink">{step.title}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-muted">{step.text}</p>
                                </li>
                            ))}
                        </ol>
                    </div>
                </section>

                <section id="storefront" className="mx-auto grid max-w-6xl scroll-mt-20 items-center gap-12 px-4 py-20 sm:px-6 sm:py-24 lg:grid-cols-2">
                    <div>
                        <span className="mk-overline text-primary">{t('المتجر الإلكتروني')}</span>
                        <h2 className="mt-3 text-3xl font-semibold text-ink">{t('متجر أونلاين جاهز، متصل بمخزونك مباشرة')}</h2>
                        <p className="mt-4 leading-relaxed text-ink-2">{t('كل طلب من متجرك يخصم من المخزون تلقائياً ويظهر في لوحة التحكم فوراً — بدون أي ربط أو برامج إضافية.')}</p>
                        <ul className="mt-6 flex flex-col gap-3">
                            {STOREFRONT_POINTS.map((point) => (
                                <li key={point} className="flex items-center gap-3 text-sm text-ink">
                                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-success-soft text-success">
                                        <Icon name="check" className="size-4" strokeWidth={2.4} />
                                    </span>
                                    {point}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <StorefrontPreview />
                </section>

                <section className="px-4 pb-20 sm:px-6 sm:pb-24">
                    {/* Closing CTA band (design system "CtaBand"): Ink, the mark as a faint watermark, one logo-green button. */}
                    <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-brand px-6 py-16 text-center sm:px-12 dark:ring-1 dark:ring-line">
                        <div className="mk-grid-texture pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" aria-hidden="true" />
                        <LogoMark className="pointer-events-none absolute -start-8 -bottom-10 size-60 text-white/[0.06]" />
                        <h2 className="relative text-3xl font-semibold text-white">{t('جاهز تنظّم تجارتك؟')}</h2>
                        <p className="relative mx-auto mt-3 max-w-xl text-white/75">{t('انضم الآن وابدأ إدارة مخزونك وطلباتك ومسوقيك من مكان واحد.')}</p>
                        <div className="relative mt-8 flex flex-wrap justify-center gap-3">
                            <Button to={isAuthenticated ? '/dashboard' : '/register'} variant="brand" size="lg" iconEnd={arrow}>
                                {isAuthenticated ? t('الذهاب إلى لوحة التحكم') : t('أنشئ متجرك مجاناً')}
                            </Button>
                            {!isAuthenticated && (
                                <Button to="/login" variant="outline-light" size="lg">
                                    {t('لدي حساب بالفعل')}
                                </Button>
                            )}
                        </div>
                    </div>
                </section>
            </main>

            <SiteFooter />
        </div>
    );
}

/** Router links can't target in-page anchors, so section buttons scroll by hand. */
function scrollToHash(hash) {
    return (event) => {
        event.preventDefault();
        document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' });
    };
}

function SectionHeading({ eyebrow, title, subtitle }) {
    return (
        <div className="mx-auto max-w-2xl text-center">
            <span className="mk-overline text-primary">{eyebrow}</span>
            <h2 className="mt-3 text-3xl font-semibold text-ink sm:text-4xl">{title}</h2>
            {subtitle && <p className="mt-3 leading-relaxed text-ink-2">{subtitle}</p>}
        </div>
    );
}

/** Illustrative dashboard mock built from markup (no screenshot to keep in sync). */
function DashboardPreview() {
    return (
        <div className="relative mx-auto mt-16 max-w-5xl" aria-hidden="true">
            <div className="rounded-2xl border border-line bg-surface p-2 shadow-pop">
                <div className="flex items-center gap-1.5 px-3 py-2">
                    <span className="size-2.5 rounded-full bg-danger/70" />
                    <span className="size-2.5 rounded-full bg-warning/70" />
                    <span className="size-2.5 rounded-full bg-success/70" />
                </div>
                <div className="grid gap-3 rounded-xl bg-bg p-3 text-start sm:p-5 md:grid-cols-[180px_1fr]">
                    <div className="hidden flex-col gap-1 rounded-xl bg-panel p-3 md:flex">
                        {[
                            ['grid', t('الرئيسية')],
                            ['shopping-bag', t('الطلبات')],
                            ['box', t('المنتجات')],
                            ['warehouse', t('المخزون')],
                            ['users', t('المسوقين')],
                            ['bar-chart', t('التقارير')],
                        ].map(([icon, label], index) => (
                            <span key={label} className={cn('flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs', index === 0 ? 'bg-white/[0.07] font-semibold text-white [&>svg]:text-brand-green' : 'text-panel-text/80')}>
                                <Icon name={icon} className="size-4" />
                                {label}
                            </span>
                        ))}
                    </div>
                    <div className="flex flex-col gap-3">
                        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                            {[
                                ['wallet', t('المبيعات'), 'text-primary bg-primary-soft'],
                                ['shopping-bag', t('الطلبات'), 'text-info bg-info-soft'],
                                ['users', t('العملاء'), 'text-success bg-success-soft'],
                                ['box', t('المنتجات'), 'text-warning bg-warning-soft'],
                            ].map(([icon, label, tone]) => (
                                <div key={label} className="rounded-xl border border-line bg-surface p-3">
                                    <span className={cn('grid size-8 place-items-center rounded-lg', tone)}>
                                        <Icon name={icon} className="size-4" />
                                    </span>
                                    <span className="mt-3 block text-xs text-muted">{label}</span>
                                    <span className="mt-1.5 block h-2.5 w-2/3 rounded-full bg-surface-3" />
                                </div>
                            ))}
                        </div>
                        <div className="rounded-xl border border-line bg-surface p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-ink">{t('المبيعات')}</span>
                                <span className="h-2 w-16 rounded-full bg-surface-3" />
                            </div>
                            <div className="mt-4 flex h-32 items-end gap-2 sm:gap-3">
                                {CHART_BARS.map((height, index) => (
                                    <span
                                        key={index}
                                        style={{ height: `${height}%` }}
                                        className={cn('flex-1 rounded-t-md', index === CHART_BARS.length - 2 ? 'bg-gradient-to-t from-primary to-accent' : 'bg-primary/20')}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StorefrontPreview() {
    return (
        <div className="relative" aria-hidden="true">
            <div className="absolute inset-6 -z-0 rounded-3xl bg-gradient-to-br from-primary/25 to-accent/25 blur-2xl" />
            <div className="relative rounded-2xl border border-line bg-surface p-4 shadow-pop">
                <div className="flex items-center justify-between rounded-xl bg-bg px-4 py-3">
                    <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                        <span className="grid size-8 place-items-center rounded-lg bg-primary text-white">
                            <Icon name="store" className="size-4" />
                        </span>
                        {t('متجري')}
                    </span>
                    <span className="flex items-center gap-3 text-ink-2">
                        <Icon name="search" className="size-4" />
                        <Icon name="heart" className="size-4" />
                        <Icon name="shopping-bag" className="size-4" />
                    </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {['bg-primary-soft', 'bg-surface-3', 'bg-warning-soft', 'bg-info-soft', 'bg-surface-3', 'bg-primary-soft'].map((tone, index) => (
                        <div key={tone} className={cn('rounded-xl border border-line p-2', index > 3 && 'hidden sm:block')}>
                            <div className={cn('grid aspect-square place-items-center rounded-lg', tone)}>
                                <Icon name="box" className="size-8 text-muted/60" />
                            </div>
                            <span className="mt-2 block h-2 w-3/4 rounded-full bg-surface-3" />
                            <span className="mt-1.5 block h-2 w-1/3 rounded-full bg-primary/30" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
