import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuth } from '@/context/AuthContext';
import { t } from '@/i18n';
import { CURRENCY } from '@/lib/constants';
import { cn, formatCompactNumber } from '@/lib/format';
import { ContactSection } from '@/pages/landing/ContactSection';
import { FeaturesSection } from '@/pages/landing/FeaturesSection';
import { Reveal, SectionHeading } from '@/pages/landing/Reveal';
import { SiteFooter } from '@/pages/landing/SiteFooter';
import { platformApi } from '@/services/platformApi';

const NAV_LINKS = [
    { href: '#about', label: t('من نحن') },
    { href: '#features', label: t('مميزاتنا') },
    { href: '#stats', label: t('أرقامنا') },
    { href: '#contact', label: t('تواصل معنا') },
];

/** Live platform totals (see PlatformStatsController), keyed by the API field. */
const STATS = [
    { key: 'stores', label: t('عدد المتاجر'), icon: 'store' },
    { key: 'orders', label: t('عدد الطلبات'), icon: 'shopping-bag' },
    { key: 'products', label: t('عدد المنتجات'), icon: 'box' },
    { key: 'sales', label: t('إجمالي المبيعات'), icon: 'wallet', isMoney: true },
];

/** Reasons to choose the platform, for the About section. */
const ABOUT_REASONS = [
    { icon: 'hub', title: t('كل تجارتك في مكان واحد'), text: t('المخزون والطلبات والمتجر والمسوقين مترابطين، فكل طلب يحدّث المخزون والتقارير تلقائياً.') },
    { icon: 'arabic', title: t('مصمم للتاجر العربي'), text: t('عربي من الأساس مع دعم كامل للإنجليزية، ويفهم طريقة البيع والشحن والتحصيل في منطقتنا.') },
    { icon: 'devices', title: t('من أي جهاز وفي أي وقت'), text: t('نظام سحابي بالكامل بدون تثبيت أو أجهزة خاصة — تابع متجرك من الموبايل أو الكمبيوتر.') },
    { icon: 'storefront', title: t('متجر جاهز في دقائق'), text: t('رابط خاص لمتجرك أو دومين باسمك، مع سلة ودفع إلكتروني وتتبع للطلبات.') },
    { icon: 'secure', title: t('بياناتك في أمان'), text: t('صلاحيات دقيقة لكل موظف وسجل كامل لكل عملية تتم في متجرك.') },
    { icon: 'growth', title: t('قرارات مبنية على أرقام'), text: t('تقارير واضحة للمبيعات والأرباح وأفضل المنتجات تساعدك تعرف أين تركز.') },
];

/** "Get started" steps, numbered in order. */
const STEPS = [
    { title: t('أنشئ حسابك'), text: t('سجّل بياناتك وبيانات متجرك في دقائق.') },
    { title: t('أضف منتجاتك'), text: t('ارفع منتجاتك وكمياتها في كل مخزن.') },
    { title: t('ابدأ البيع'), text: t('شارك رابط متجرك واستقبل طلباتك وتابعها من لوحة واحدة.') },
];

/** Accent glow under the hero's call to action, lifting on hover. */
const GLOW = 'shadow-[0_8px_20px_-10px_rgb(245_165_36/0.35)] transition-[translate,box-shadow,filter] duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-10px_rgb(245_165_36/0.45)]';

export function LandingPage() {
    const { isAuthenticated } = useAuth();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const activeSection = useActiveSection(NAV_LINKS.map((link) => link.href));
    // Icon mirrors arrows in English itself, so the Arabic drawing is always the one to ask for.
    const arrow = 'arrow-left';
    // Clear over the hero; once scrolled (or opened) the bar turns into a solid floating surface.
    const isSolid = isScrolled || isMenuOpen;

    useEffect(() => {
        const onScroll = () => setIsScrolled(window.scrollY > 24);

        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });

        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const primaryAction = isAuthenticated ? (
        <Button to="/dashboard" variant="brand" size="xl" iconEnd={arrow} className={GLOW}>
            {t('الذهاب إلى لوحة التحكم')}
        </Button>
    ) : (
        <Button to="/register" variant="brand" size="xl" iconEnd={arrow} className={GLOW}>
            {t('ابدأ مجاناً')}
        </Button>
    );

    return (
        <div className="min-h-dvh scroll-smooth bg-bg">
            <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-4 sm:pt-4">
                <div
                    className={cn(
                        'mx-auto max-w-6xl rounded-2xl border transition-[background-color,border-color,box-shadow] duration-300',
                        isSolid ? 'border-line bg-surface/85 shadow-pop backdrop-blur-xl backdrop-saturate-150' : 'border-transparent',
                    )}
                >
                    <div className={cn('flex items-center gap-4 ps-4 pe-2 transition-[height] duration-300 sm:ps-5', isScrolled ? 'h-14' : 'h-16')}>
                        <div className="flex min-w-0 flex-1 items-center">
                            <Link to="/" aria-label={t('الصفحة الرئيسية لـ Sellygrow')} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                                <Logo className="h-3 sm:h-[18px]" inverse={!isSolid} />
                            </Link>
                        </div>
                        <nav className="hidden items-center gap-1 md:flex" aria-label={t('القائمة الرئيسية')}>
                            {NAV_LINKS.map((link) => {
                                const isActive = activeSection === link.href;

                                return (
                                    <a
                                        key={link.href}
                                        href={link.href}
                                        aria-current={isActive ? 'location' : undefined}
                                        className={cn(
                                            'relative rounded-lg px-3 py-2 text-sm transition',
                                            'after:absolute after:inset-x-3 after:bottom-1 after:h-0.5 after:origin-center after:rounded-full after:bg-gold after:transition-transform after:duration-300',
                                            isActive ? 'font-medium after:scale-x-100' : 'after:scale-x-0 hover:after:scale-x-100',
                                            isSolid ? (isActive ? 'text-ink' : 'text-ink-2 hover:text-ink') : isActive ? 'text-white' : 'text-white/75 hover:text-white',
                                        )}
                                    >
                                        {link.label}
                                    </a>
                                );
                            })}
                        </nav>
                        <div className="flex shrink-0 items-center justify-end gap-1.5 md:flex-1">
                            <LanguageToggle className={cn('hidden sm:grid', !isSolid && 'text-white/80! hover:bg-white/10! hover:text-white!')} />
                            <ThemeToggle className={cn(!isSolid && 'text-white/80! hover:bg-white/10! hover:text-white!')} />
                            {isAuthenticated ? (
                                <Button to="/dashboard" variant="brand">
                                    {t('لوحة التحكم')}
                                </Button>
                            ) : (
                                <>
                                    <span className="hidden sm:block">
                                        <Button to="/login" variant={isSolid ? 'ghost' : 'outline-light'}>
                                            {t('تسجيل الدخول')}
                                        </Button>
                                    </span>
                                    <Button to="/register" variant="brand">
                                        {t('ابدأ مجاناً')}
                                    </Button>
                                </>
                            )}
                            <button
                                type="button"
                                onClick={() => setIsMenuOpen((open) => !open)}
                                aria-expanded={isMenuOpen}
                                aria-controls="landing-mobile-menu"
                                aria-label={isMenuOpen ? t('إغلاق القائمة') : t('فتح القائمة')}
                                className={cn(
                                    'grid size-10 place-items-center rounded-xl border transition md:hidden',
                                    isSolid ? 'border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink' : 'border-white/20 text-white hover:bg-white/10',
                                )}
                            >
                                <Icon name={isMenuOpen ? 'x' : 'menu'} />
                            </button>
                        </div>
                    </div>
                    {isMenuOpen && (
                        <nav id="landing-mobile-menu" className="animate-pop border-t border-line px-2 pt-2 pb-3 md:hidden" aria-label={t('القائمة الرئيسية')}>
                            {NAV_LINKS.map((link) => (
                                <a
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setIsMenuOpen(false)}
                                    className={cn(
                                        'flex items-center justify-between rounded-xl px-3 py-3 text-sm transition',
                                        activeSection === link.href ? 'bg-primary-soft font-medium text-primary' : 'text-ink-2 hover:bg-surface-3 hover:text-ink',
                                    )}
                                >
                                    {link.label}
                                    <Icon name="chevron-left" className="size-4 opacity-50" />
                                </a>
                            ))}
                            <div className="mt-2 flex items-center gap-2 border-t border-line px-1 pt-3">
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
                </div>
            </header>

            <main>
                {/* Slate hero in both themes: the pitch beside a capture of the dashboard, over drifting glows and a dune skyline. */}
                <section className="relative isolate overflow-hidden bg-brand bg-[radial-gradient(ellipse_80%_70%_at_70%_0%,#1d3577_0%,#0f1d42_55%,#0a1532_100%)] text-white">
                    <HeroBackdrop />

                    <div className="relative mx-auto grid min-h-[100svh] max-w-6xl items-center gap-14 px-4 pt-32 pb-36 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:gap-10 lg:pt-28 lg:pb-40">
                        <div className="text-center lg:text-start">
                            <Reveal as="span" className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.05] px-4 py-1.5 text-sm text-white/80 backdrop-blur">
                                <span className="relative flex size-2">
                                    <span className="absolute inset-0 animate-[mk-ping_1.8s_cubic-bezier(0,0,0.2,1)_infinite] rounded-full bg-gold" />
                                    <span className="relative size-2 rounded-full bg-gold" />
                                </span>
                                {t('منصة متكاملة لإدارة تجارتك')}
                            </Reveal>
                            <Reveal as="h1" delay={100} className="mt-7 text-[40px] leading-[1.3] font-bold tracking-tight sm:text-[56px] lg:text-[60px]">
                                <span className="block">{t('إدارة تجارتك')}</span>
                                <span className="mk-accent-text block pb-2">{t('لم تعد معقدة')}</span>
                            </Reveal>
                            <Reveal as="p" delay={200} className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-white/70 lg:mx-0">
                                {t('Sellygrow يجمع المخزون والطلبات والمتجر الإلكتروني والمسوقين في لوحة واحدة — لتقضي وقتاً أقل في المتابعة ووقتاً أكثر في تنمية تجارتك.')}
                            </Reveal>
                            <Reveal delay={300} className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center lg:justify-start">
                                {primaryAction}
                                <Button variant="outline-light" size="xl" onClick={scrollToHash('#about')}>
                                    {t('اعرف أكثر')}
                                </Button>
                            </Reveal>
                        </div>

                        <Reveal from="zoom" delay={250}>
                            <HeroVisual />
                        </Reveal>
                    </div>
                </section>

                {/* About: a header row (pitch beside its lead), then a bento grid led by a slate card for the core promise. */}
                <section id="about" className="mx-auto max-w-6xl scroll-mt-28 px-4 py-20 sm:px-6 sm:py-28">
                    <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <SectionHeading
                            align="start"
                            badge={t('لماذا Sellygrow؟')}
                            title={
                                <>
                                    {t('لماذا تختار')} <span className="text-(--mk-gold-ink)">Sellygrow</span>
                                    {t('؟')}
                                </>
                            }
                        />
                        <Reveal delay={150} className="max-w-md text-center lg:text-start">
                            <p className="leading-relaxed text-muted sm:text-lg">{t('منصة واحدة تدير منها مخزونك وطلباتك ومتجرك الإلكتروني ومسوقيك — في أي وقت، ومن أي جهاز.')}</p>
                            <Button variant="secondary" size="lg" iconEnd={arrow} onClick={scrollToHash('#features')} className="mt-5">
                                {t('اكتشف المميزات')}
                            </Button>
                        </Reveal>
                    </div>

                    <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        <Reveal className="sm:col-span-2 lg:row-span-2">
                            <FeaturedReason reason={ABOUT_REASONS[0]} />
                        </Reveal>
                        {ABOUT_REASONS.slice(1).map((reason, index) => (
                            <Reveal key={reason.title} delay={(index + 1) * 90}>
                                <article className="group relative h-full overflow-hidden rounded-2xl border border-line bg-surface p-6 shadow-card transition-[translate,border-color,box-shadow] duration-500 ease-out before:absolute before:inset-x-0 before:top-0 before:h-1 before:origin-[inline-start] before:scale-x-0 before:bg-gold before:transition-transform before:duration-500 hover:-translate-y-1.5 hover:border-gold/40 hover:shadow-[0_24px_48px_-24px_rgb(245_165_36/0.4)] hover:before:scale-x-100">
                                    <div className="flex items-center gap-3.5">
                                        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-light to-brand text-white transition-transform duration-500 ease-out group-hover:-rotate-6 [&_svg]:size-6">
                                            <AboutIcon name={reason.icon} />
                                        </span>
                                        <h3 className="text-base font-semibold text-ink sm:text-lg">{reason.title}</h3>
                                    </div>
                                    <p className="mt-4 text-sm leading-relaxed text-muted">{reason.text}</p>
                                </article>
                            </Reveal>
                        ))}
                    </div>
                </section>

                <PlatformStats />

                <FeaturesSection />

                <StepsSection />

                <CallToAction primaryAction={primaryAction} />

                <ContactSection />
            </main>

            <SiteFooter />
        </div>
    );
}

/** The hero's decoration: a faint grid fading out from the top, two drifting glows and layered dunes along the bottom. */
function HeroBackdrop() {
    return (
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
            <div className="absolute inset-0 bg-[linear-gradient(rgb(255_255_255/0.04)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.04)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_20%,#000_20%,transparent_75%)]" />
            <div className="absolute -top-24 start-[8%] size-[380px] animate-[mk-float_12s_ease-in-out_infinite] rounded-full bg-gold/20 blur-[110px]" />
            <div className="absolute top-1/3 end-[4%] size-[440px] animate-[mk-float_15s_ease-in-out_-5s_infinite] rounded-full bg-brand-accent/30 blur-[120px]" />
            <svg viewBox="0 0 1440 220" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-40 w-full sm:h-56">
                <path d="M0 140 160 70l140 60 180-96 170 92 150-62 190 84 160-70 140 52 150-44v134H0Z" className="fill-white/[0.03]" />
                <path d="M0 176 200 110l170 52 200-80 180 74 190-58 160 60 180-46 160 40v68H0Z" className="fill-white/[0.05]" />
                <path d="M0 160 200 110l170 52 200-80 180 74 190-58 160 60 180-46 160 40" fill="none" stroke="url(#mk-dune-edge)" strokeWidth="1.5" />
                <defs>
                    <linearGradient id="mk-dune-edge" x1="0" x2="1">
                        <stop offset="0" stopColor="#f5a524" stopOpacity="0" />
                        <stop offset="0.5" stopColor="#f5a524" stopOpacity="0.55" />
                        <stop offset="1" stopColor="#f5a524" stopOpacity="0" />
                    </linearGradient>
                </defs>
            </svg>
        </div>
    );
}

/** "Get started in three steps": numbered cards joined by a gold rail on large screens. */
function StepsSection() {
    return (
        <section>
            <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
                <SectionHeading badge={t('كيف تبدأ')} title={t('ابدأ في ثلاث خطوات')} text={t('من التسجيل حتى أول طلب في وقت أقل مما تتوقع.')} />
                <ol className="relative mt-16 grid gap-6 lg:grid-cols-3 lg:gap-8">
                    <span className="absolute inset-x-[16%] top-8 hidden h-px bg-gradient-to-l from-gold/0 via-gold/60 to-gold/0 lg:block" aria-hidden="true" />
                    {STEPS.map((step, index) => (
                        <Reveal as="li" key={step.title} delay={index * 140} className="group relative text-center">
                            <span className="mk-num relative mx-auto grid size-16 place-items-center rounded-2xl border border-gold/30 bg-surface text-xl font-bold text-(--mk-gold-ink) shadow-[0_12px_30px_-14px_rgb(245_165_36/0.6)] transition-[translate,background-color,color] duration-500 ease-out group-hover:-translate-y-1 group-hover:bg-gold group-hover:text-brand">
                                {String(index + 1).padStart(2, '0')}
                            </span>
                            <h3 className="mt-6 text-xl font-semibold text-ink">{step.title}</h3>
                            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted sm:text-[15px]">{step.text}</p>
                        </Reveal>
                    ))}
                </ol>
            </div>
        </section>
    );
}

/** The closing pitch on a slate card with a gold glow, just above the contact form. */
function CallToAction({ primaryAction }) {
    return (
        <section className="mx-auto max-w-6xl px-4 pt-20 sm:px-6 sm:pt-28">
            <Reveal className="relative isolate overflow-hidden rounded-3xl bg-brand bg-[radial-gradient(ellipse_at_top,#1d3577,#0f1d42_70%)] px-6 py-14 text-center text-white sm:px-12 sm:py-20">
                <div className="pointer-events-none absolute -bottom-32 left-1/2 -z-10 size-[420px] -translate-x-1/2 animate-[mk-float_10s_ease-in-out_infinite] rounded-full bg-gold/25 blur-[100px]" aria-hidden="true" />
                <h2 className="mx-auto max-w-2xl text-[28px] leading-tight font-bold sm:text-[40px]">
                    {t('جاهز تنقل تجارتك')} <span className="mk-accent-text">{t('لمستوى أعلى؟')}</span>
                </h2>
                <p className="mx-auto mt-4 max-w-xl leading-relaxed text-white/65 sm:text-lg">{t('أنشئ حسابك الآن وابدأ إدارة مخزونك وطلباتك ومتجرك من مكان واحد.')}</p>
                <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                    {primaryAction}
                    <Button variant="outline-light" size="xl" icon="mail" onClick={scrollToHash('#contact')}>
                        {t('تواصل معنا')}
                    </Button>
                </div>
            </Reveal>
        </section>
    );
}
/** Modules the featured About card shows joined around the hub. */
const CONNECTED_MODULES = [t('المخزون'), t('الطلبات'), t('المتجر'), t('المسوقين'), t('التقارير')];

/** The bento's lead card: the core promise on slate, with the modules it ties together as linked pills. */
function FeaturedReason({ reason }) {
    return (
        <article className="group relative isolate flex h-full flex-col overflow-hidden rounded-3xl bg-brand bg-[radial-gradient(ellipse_at_top,#1d3577,#0f1d42_70%)] p-7 text-white sm:p-9">
            <div className="pointer-events-none absolute -end-20 -bottom-24 -z-10 size-72 rounded-full bg-gold/25 blur-[90px] transition-transform duration-700 ease-out group-hover:scale-125" aria-hidden="true" />
            <span className="grid size-14 place-items-center rounded-2xl bg-gold text-brand transition-transform duration-500 ease-out group-hover:-rotate-6">
                <AboutIcon name={reason.icon} />
            </span>
            <h3 className="mt-6 text-2xl font-bold sm:text-3xl">{reason.title}</h3>
            <p className="mt-3 max-w-md leading-relaxed text-white/70">{reason.text}</p>
            <ul className="mt-auto flex flex-wrap gap-2 pt-8">
                {CONNECTED_MODULES.map((module, index) => (
                    <li
                        key={module}
                        style={{ transitionDelay: `${index * 60}ms` }}
                        className="flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-sm text-white/85 transition-[border-color,background-color] duration-500 group-hover:border-gold/50 group-hover:bg-gold/15"
                    >
                        <span className="size-1.5 rounded-full bg-gold" />
                        {module}
                    </li>
                ))}
            </ul>
        </article>
    );
}

/** Two-tone line icons drawn for the About cards: white strokes over a translucent white fill, on a green tile. */
function AboutIcon({ name }) {
    const accent = 'fill-white/25';
    // Masks what sits behind an overlapping shape (the tile's own slate).
    const mask = 'fill-brand';
    const shapes = {
        hub: (
            <>
                <circle cx="24" cy="24" r="6" className={accent} />
                <rect x="4" y="4" width="12" height="12" rx="3" />
                <rect x="32" y="4" width="12" height="12" rx="3" />
                <rect x="4" y="32" width="12" height="12" rx="3" />
                <rect x="32" y="32" width="12" height="12" rx="3" className={accent} />
                <path d="M16 16l3.8 3.8M32 16l-3.8 3.8M16 32l3.8-3.8M32 32l-3.8-3.8" />
            </>
        ),
        arabic: (
            <>
                <path d="M9 8h30a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H22l-8 7v-7H9a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4Z" className={accent} />
                <text x="24" y="27" textAnchor="middle" fontSize="17" fontWeight="700" fill="currentColor" stroke="none">
                    ع
                </text>
            </>
        ),
        devices: (
            <>
                <rect x="4" y="9" width="30" height="21" rx="2.5" />
                <path d="M2 36h28" />
                <rect x="31" y="17" width="14" height="25" rx="3" className={mask} />
                <rect x="31" y="17" width="14" height="25" rx="3" className={accent} />
                <path d="M36 37h4" />
            </>
        ),
        storefront: (
            <>
                <path d="M8 20v20h22M40 20v6" />
                <path d="M5 20 9 8h30l4 12H5Z" className={accent} />
                <path d="M19 40V30h8v10" />
                <circle cx="37" cy="37" r="7" className={mask} />
                <circle cx="37" cy="37" r="7" className={accent} />
                <path d="M37 33.5V37l2.5 1.5" />
            </>
        ),
        secure: (
            <>
                <path d="M24 4 40 10v12c0 10-7 18-16 22C15 40 8 32 8 22V10l16-6Z" className={accent} />
                <rect x="17.5" y="22" width="13" height="10" rx="2" className={mask} />
                <path d="M20 22v-3a4 4 0 0 1 8 0v3M24 26v2" />
            </>
        ),
        growth: (
            <>
                <path d="M6 6v36h36" />
                <rect x="12" y="28" width="6" height="10" rx="1.5" />
                <rect x="22" y="22" width="6" height="16" rx="1.5" />
                <rect x="32" y="15" width="6" height="23" rx="1.5" className={accent} />
                <path d="m12 20 9-7 6 4 12-10M33 7h6v6" />
            </>
        ),
    };

    return (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="size-8" aria-hidden="true">
            {shapes[name]}
        </svg>
    );
}

/**
 * Platform figures on one card: four cells split by hairlines, each an icon tile, the figure and its label. The
 * totals come from the API and count up once the card scrolls into view; it hides itself if they can't be loaded.
 */
function PlatformStats() {
    const [stats, setStats] = useState(null);
    const [isInView, setIsInView] = useState(false);
    const sectionRef = useRef(null);

    useEffect(() => {
        platformApi
            .stats()
            .then(setStats)
            .catch(() => setStats(false));
    }, []);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.4 },
        );

        observer.observe(sectionRef.current);

        return () => observer.disconnect();
    }, []);

    if (stats === false) {
        return null;
    }

    return (
        <section ref={sectionRef} id="stats" aria-label={t('أرقام عن المنصة')} aria-busy={stats === null} className="mx-auto max-w-6xl scroll-mt-28 px-4 pb-20 sm:px-6 sm:pb-28">
            <Reveal className="relative overflow-hidden rounded-3xl border border-line bg-surface shadow-raise">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-primary via-gold to-primary" aria-hidden="true" />
                <dl className="grid grid-cols-2 lg:grid-cols-4">
                    {STATS.map((stat, index) => (
                        <Reveal
                            key={stat.key}
                            delay={index * 100}
                            className={cn('group flex flex-col items-start gap-1 border-line p-5 sm:p-8', index % 2 === 1 && 'border-s', index < 2 && 'border-b lg:border-b-0', index === 2 && 'lg:border-s')}
                        >
                            <span className="mb-3 grid size-11 place-items-center rounded-xl bg-primary-soft text-primary transition-transform duration-300 group-hover:-translate-y-0.5">
                                <Icon name={stat.icon} className="size-5" />
                            </span>
                            <dd className="mk-num order-2 flex h-10 items-center text-[30px] leading-none font-bold tracking-tight whitespace-nowrap text-ink sm:h-12 sm:text-[38px]">
                                {stats ? <CountUp value={stats[stat.key]} isRunning={isInView} /> : <span className="h-full w-20 animate-pulse rounded-lg bg-surface-3" />}
                            </dd>
                            <dt className="order-3 text-sm text-muted">{stat.isMoney ? `${stat.label} (${CURRENCY})` : stat.label}</dt>
                        </Reveal>
                    ))}
                </dl>
            </Reveal>
        </section>
    );
}

/** Counts from 0 to `value` with an ease-out once `isRunning` turns on (instantly under reduced motion). */
function CountUp({ value, isRunning }) {
    const [shownValue, setShownValue] = useState(0);

    useEffect(() => {
        if (!isRunning) {
            return undefined;
        }

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setShownValue(value);

            return undefined;
        }

        // Timed from the first frame: its timestamp can predate a performance.now() taken here.
        let startedAt = null;
        let frame;
        const tick = (now) => {
            startedAt ??= now;
            const progress = Math.min(1, (now - startedAt) / 1400);

            setShownValue(value * (1 - (1 - progress) ** 3));

            if (progress < 1) {
                frame = requestAnimationFrame(tick);
            }
        };

        frame = requestAnimationFrame(tick);

        return () => cancelAnimationFrame(frame);
    }, [isRunning, value]);

    return <span>{formatCompactNumber(shownValue)}</span>;
}

/** Router links can't target in-page anchors, so section buttons scroll by hand. */
function scrollToHash(hash) {
    return (event) => {
        event.preventDefault();
        document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' });
    };
}

/** The in-page section (by hash) that sits under the middle of the viewport, for the navbar's active link. */
function useActiveSection(hashes) {
    const [activeHash, setActiveHash] = useState(null);
    const key = hashes.join(',');

    useEffect(() => {
        const sections = key
            .split(',')
            .map((hash) => document.querySelector(hash))
            .filter(Boolean);
        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries.find((entry) => entry.isIntersecting);

                if (visible) {
                    setActiveHash(`#${visible.target.id}`);
                } else if (window.scrollY < window.innerHeight / 2) {
                    setActiveHash(null);
                }
            },
            { rootMargin: '-45% 0px -50% 0px' },
        );

        sections.forEach((section) => observer.observe(section));

        return () => observer.disconnect();
    }, [key]);

    return activeHash;
}

/**
 * A real capture of the merchant dashboard (demo data) in a browser frame. On large screens it rests turned
 * toward the pitch and eases flat on hover; the light or dark capture follows the site theme.
 */
function HeroVisual() {
    return (
        <div className="group relative [perspective:2000px] lg:w-[125%]">
            <div className="absolute -inset-x-6 inset-y-8 rounded-[2rem] bg-gradient-to-br from-gold/40 via-brand-accent/25 to-transparent blur-3xl" aria-hidden="true" />
            <figure className="relative rounded-2xl border border-white/15 bg-surface/90 p-1.5 shadow-[0_50px_100px_-40px_rgb(10_21_50/0.7)] backdrop-blur transition-transform duration-700 ease-out lg:origin-left lg:[transform:rotateY(12deg)_rotateX(4deg)] lg:group-hover:[transform:rotateY(4deg)_rotateX(1deg)] lg:rtl:origin-right lg:rtl:[transform:rotateY(-12deg)_rotateX(4deg)] lg:rtl:group-hover:[transform:rotateY(-4deg)_rotateX(1deg)]">
                <div className="flex items-center gap-3 px-3 py-2" dir="ltr" aria-hidden="true">
                    <span className="flex gap-1.5">
                        <span className="size-2.5 rounded-full bg-danger/70" />
                        <span className="size-2.5 rounded-full bg-warning/70" />
                        <span className="size-2.5 rounded-full bg-success/70" />
                    </span>
                    <span className="mx-auto flex h-6 w-full max-w-60 items-center justify-center gap-1.5 rounded-md bg-surface-3 text-[11px] text-muted">
                        <Icon name="lock" className="size-3" />
                        {t('لوحة تحكم التاجر')}
                    </span>
                    <span className="w-10" />
                </div>
                <div className="overflow-hidden rounded-xl border border-line">
                    <img
                        src="/images/landing/dashboard-light.jpg"
                        alt={t('لوحة تحكم Sellygrow: المبيعات والطلبات والمخزون في شاشة واحدة')}
                        width="2880"
                        height="1800"
                        fetchPriority="high"
                        className="w-full dark:hidden"
                    />
                    <img
                        src="/images/landing/dashboard-dark.jpg"
                        alt={t('لوحة تحكم Sellygrow: المبيعات والطلبات والمخزون في شاشة واحدة')}
                        width="2880"
                        height="1800"
                        loading="lazy"
                        className="hidden w-full dark:block"
                    />
                </div>
            </figure>
        </div>
    );
}
