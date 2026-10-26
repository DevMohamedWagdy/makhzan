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
    { key: 'stores', label: t('عدد المتاجر') },
    { key: 'orders', label: t('عدد الطلبات') },
    { key: 'products', label: t('عدد المنتجات') },
    { key: 'sales', label: t('إجمالي المبيعات'), isMoney: true },
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

/** Staggered entrance for the hero; the global reduced-motion rule turns it off. */
const RISE = 'animate-[mk-pop_0.7s_cubic-bezier(0.22,1,0.36,1)_both]';

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
        <Button to="/dashboard" size="xl" iconEnd={arrow}>
            {t('الذهاب إلى لوحة التحكم')}
        </Button>
    ) : (
        <Button to="/register" size="xl" iconEnd={arrow}>
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
                                <Logo className="h-3 sm:h-[18px]" />
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
                                            'rounded-lg px-3 py-2 text-sm transition',
                                            isActive ? 'bg-primary-soft font-medium text-primary' : 'text-ink-2 hover:bg-surface-3 hover:text-ink',
                                        )}
                                    >
                                        {link.label}
                                    </a>
                                );
                            })}
                        </nav>
                        <div className="flex shrink-0 items-center justify-end gap-1.5 md:flex-1">
                            <LanguageToggle className="hidden sm:grid" />
                            <ThemeToggle />
                            {isAuthenticated ? (
                                <Button to="/dashboard">
                                    {t('لوحة التحكم')}
                                </Button>
                            ) : (
                                <>
                                    <span className="hidden sm:block">
                                        <Button to="/login" variant="ghost">
                                            {t('تسجيل الدخول')}
                                        </Button>
                                    </span>
                                    <Button to="/register">
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
                                className="grid size-10 place-items-center rounded-xl border border-line bg-surface text-ink-2 transition hover:border-line-strong hover:text-ink md:hidden"
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
                {/* Split hero: the pitch on one side, a real capture of the merchant dashboard on the other. */}
                <section className="relative overflow-hidden bg-gradient-to-b from-primary-soft/70 via-bg to-bg">
                    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                        <div className="absolute -top-32 -end-32 size-[520px] rounded-full bg-brand-accent/15 blur-3xl" />
                        <div className="absolute -bottom-40 -start-32 size-[420px] rounded-full bg-primary/10 blur-3xl" />
                    </div>

                    <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-32 pb-20 sm:px-6 sm:pt-40 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12 lg:pb-32">
                        <div className="text-center lg:text-start">
                            <h1 className={cn('text-[42px] leading-[1.2] font-bold tracking-tight text-ink sm:text-[58px] lg:text-[56px]', RISE)}>
                                <span className="block">{t('إدارة تجارتك')}</span>
                                <span className="block bg-gradient-to-l from-primary to-brand-accent bg-clip-text text-transparent">{t('لم تعد معقدة')}</span>
                            </h1>
                            <p className={cn('mx-auto mt-6 max-w-xl text-xl leading-relaxed font-medium text-ink [animation-delay:100ms] sm:text-2xl lg:mx-0', RISE)}>
                                {t('مخزون ذكي، طلبات منظمة، وتقارير لحظية في مكان واحد.')}
                            </p>
                            <p className={cn('mx-auto mt-4 max-w-xl leading-relaxed text-muted [animation-delay:180ms] lg:mx-0', RISE)}>
                                {t('Sellygrow يجمع المخزون والطلبات والمتجر الإلكتروني والمسوقين في لوحة واحدة — لتقضي وقتاً أقل في المتابعة ووقتاً أكثر في تنمية تجارتك.')}
                            </p>
                            <div className={cn('mt-9 flex flex-col items-stretch gap-3 [animation-delay:260ms] sm:flex-row sm:items-center sm:justify-center lg:justify-start', RISE)}>
                                {primaryAction}
                                <Button variant="secondary" size="xl" icon="info" onClick={scrollToHash('#about')}>
                                    {t('من نحن')}
                                </Button>
                            </div>
                        </div>

                        <div className={cn('[animation-delay:200ms]', RISE)}>
                            <HeroVisual />
                        </div>
                    </div>
                </section>

                {/* About: why merchants choose the platform, a centered heading over six outlined cards. */}
                <section id="about" className="mx-auto max-w-6xl scroll-mt-28 px-4 py-20 sm:px-6 sm:py-24">
                    <div className="mx-auto max-w-2xl text-center">
                        <h2 className="text-[32px] leading-tight font-bold text-ink sm:text-[44px]">
                            {t('لماذا تختار')} <span className="text-primary">Sellygrow</span>{t('؟')}
                        </h2>
                        <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
                            {t('منصة واحدة تدير منها مخزونك وطلباتك ومتجرك الإلكتروني ومسوقيك — في أي وقت، ومن أي جهاز.')}
                        </p>
                    </div>
                    <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
                        {ABOUT_REASONS.map((reason) => (
                            <article key={reason.title} className="group rounded-2xl border border-line bg-surface p-7 shadow-card transition duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-raise">
                                <span className="grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-brand-accent to-primary text-white shadow-[0_10px_24px_-10px_rgb(24_44_97/0.5)] transition duration-300 group-hover:scale-105 group-hover:-rotate-3">
                                    <AboutIcon name={reason.icon} />
                                </span>
                                <h3 className="mt-6 text-xl font-semibold text-ink">{reason.title}</h3>
                                <p className="mt-3 text-sm leading-relaxed text-muted sm:text-[15px]">{reason.text}</p>
                            </article>
                        ))}
                    </div>
                </section>

                <PlatformStats />

                <FeaturesSection />

                <ContactSection />
            </main>

            <SiteFooter />
        </div>
    );
}

/** Two-tone line icons drawn for the About cards: white strokes over a translucent white fill, on a green tile. */
function AboutIcon({ name }) {
    const accent = 'fill-white/25';
    // Masks what sits behind an overlapping shape (the tile's own green).
    const mask = 'fill-primary';
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
 * Stats band: big brand-accent figures with a short label, no dividers. The totals come from the API and
 * count up once the band scrolls into view; the band hides itself if they can't be loaded.
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
        <section ref={sectionRef} id="stats" aria-label={t('أرقام عن المنصة')} aria-busy={stats === null} className="scroll-mt-28 border-y border-primary/10 bg-primary-soft/70 dark:bg-primary-soft/40">
            <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-12 px-4 py-12 sm:px-6 sm:py-16 md:grid-cols-4">
                {STATS.map((stat) => (
                    <div key={stat.key} className="flex flex-col items-center text-center">
                        <dt className="order-2 mt-3 text-sm text-ink-2 sm:text-base">{stat.isMoney ? `${stat.label} (${CURRENCY})` : stat.label}</dt>
                        <dd className="mk-num order-1 flex h-10 items-center text-[36px] leading-none font-bold tracking-tight whitespace-nowrap text-primary sm:h-12 sm:text-[40px] lg:text-[46px] xl:h-[52px] xl:text-[52px]">
                            {stats ? (
                                <CountUp value={stats[stat.key]} isRunning={isInView} />
                            ) : (
                                <span className="h-full w-24 animate-pulse rounded-lg bg-surface-3" />
                            )}
                        </dd>
                    </div>
                ))}
            </dl>
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
 * A real capture of the merchant dashboard (demo data) in a browser frame. On large screens it tilts back in 3D
 * and runs past the page edge; the light or dark capture follows the site theme.
 */
function HeroVisual() {
    return (
        <div className="relative [perspective:2400px] lg:w-[150%]">
            <Chevrons className="absolute -top-14 start-6 hidden h-12 w-16 text-brand-accent sm:block" />
            <Chevrons className="absolute -bottom-14 start-1/3 hidden h-12 w-16 rotate-180 text-brand-accent sm:block" />
            <div className="absolute inset-10 rounded-[2rem] bg-gradient-to-br from-brand-accent/40 via-primary/15 to-info/10 blur-3xl" aria-hidden="true" />
            <figure className="relative rounded-2xl border border-line bg-surface/90 p-1.5 shadow-[0_50px_100px_-40px_rgb(24_44_97/0.4)] backdrop-blur lg:origin-left lg:[transform:rotateY(10deg)_rotateX(4deg)] lg:rtl:origin-right lg:rtl:[transform:rotateY(-10deg)_rotateX(4deg)]">
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

function Chevrons({ className }) {
    return (
        <svg viewBox="0 0 72 52" fill="none" stroke="currentColor" strokeWidth="5" className={className} aria-hidden="true">
            <path d="M30 4 8 26l22 22" />
            <path d="M60 4 38 26l22 22" opacity="0.4" />
        </svg>
    );
}

