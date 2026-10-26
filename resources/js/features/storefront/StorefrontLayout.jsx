import { Suspense, createContext, useContext, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Logo } from '@/components/brand/Logo';
import { Avatar } from '@/components/ui/Display';
import { Dropdown } from '@/components/ui/Dropdown';
import { Icon } from '@/components/ui/Icon';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { Skeleton, PageLoader } from '@/components/ui/Spinner';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { t } from '@/i18n';
import { cn } from '@/lib/format';
import { storefrontApi } from '@/services/storefrontApi';
import { CartProvider, useCart } from './CartContext';
import { CustomerAuthProvider, useCustomerAuth } from './CustomerAuthContext';
import { useToast } from '@/context/ToastContext';
import { captureCoupon } from './couponLink';
import { captureReferral } from './referral';
import { captureClickIds, initTracking, trackPageView } from './tracking';

const StorefrontContext = createContext(null);

/** `{ storeSlug, store, categories, collections, featured, latest }` from the store home endpoint. */
export function useStorefront() {
    return useContext(StorefrontContext);
}

function SearchBox({ storeSlug, className }) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [term, setTerm] = useState(searchParams.get('q') ?? '');

    return (
        <form
            role="search"
            className={cn('h-11 items-center overflow-hidden rounded-xl border border-line-strong bg-surface-2 p-1 transition focus-within:border-primary focus-within:bg-surface focus-within:shadow-[0_0_0_3px_var(--mk-ring)]', className)}
            onSubmit={(event) => {
                event.preventDefault();
                term.trim() && navigate(`/${storeSlug}/search?q=${encodeURIComponent(term.trim())}`);
            }}
        >
            <input type="search" value={term} onChange={(event) => setTerm(event.target.value)} placeholder={t('ابحث عن منتج...')} aria-label={t('بحث في المتجر')} className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm text-ink outline-none placeholder:text-muted" />
            <button type="submit" className="grid h-full w-10 shrink-0 place-items-center rounded-lg bg-primary text-white transition hover:bg-primary-hover" aria-label={t('بحث')}>
                <Icon name="search" className="size-[18px]" />
            </button>
        </form>
    );
}

/** Icon with a caption under it on wide screens (account, wishlist, cart in the header). */
function HeaderAction({ icon, label, badge, className, ...props }) {
    return (
        <span className={cn('relative flex items-center gap-2 rounded-lg px-2 py-1.5 text-ink-2 transition hover:bg-surface-3 hover:text-ink', className)} {...props}>
            <span className="relative">
                <Icon name={icon} className="size-[22px]" />
                {badge > 0 && <span className="mk-num absolute -top-2 -end-2 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-primary px-1 text-3xs font-semibold text-white ring-2 ring-surface">{badge > 99 ? '99+' : badge}</span>}
            </span>
            {label && <span className="hidden max-w-28 truncate text-sm font-semibold lg:block">{label}</span>}
        </span>
    );
}

function CartButton({ storeSlug }) {
    const { count } = useCart();

    return (
        <Link to={`/${storeSlug}/cart`} aria-label={t('السلة ({count})', { count })} title={t('السلة')}>
            <HeaderAction icon="shopping-bag" label={t('السلة')} badge={count} />
        </Link>
    );
}

function AccountButton({ storeSlug }) {
    const { customer, isAuthenticated, logout } = useCustomerAuth();
    const { store } = useStorefront();
    const navigate = useNavigate();

    if (!isAuthenticated) {
        return (
            <Link to={`/${storeSlug}/account/login`} aria-label={t('تسجيل الدخول')} title={t('تسجيل الدخول')}>
                <HeaderAction icon="user" label={t('تسجيل الدخول')} />
            </Link>
        );
    }

    return (
        <Dropdown
            label={t('حسابي')}
            trigger={(props) => (
                <button type="button" {...props} title={customer?.full_name}>
                    <HeaderAction icon="user" label={customer?.full_name?.split(' ')[0] ?? t('حسابي')} />
                </button>
            )}
            items={[
                { label: t('طلباتي'), icon: 'shopping-bag', onClick: () => navigate(`/${storeSlug}/account/orders`) },
                { label: t('المفضلة'), icon: 'heart', onClick: () => navigate(`/${storeSlug}/account/wishlist`) },
                { label: t('نقاطي'), icon: 'star', onClick: () => navigate(`/${storeSlug}/account/points`), hidden: !store?.loyalty },
                { divider: true },
                {
                    label: t('تسجيل الخروج'),
                    icon: 'log-out',
                    tone: 'danger',
                    onClick: () => {
                        logout();
                        navigate(`/${storeSlug}`);
                    },
                },
            ]}
        />
    );
}

/** Phone-only tab bar at the bottom of the screen, like shopping apps. */
function MobileTabBar({ storeSlug }) {
    const { count } = useCart();
    const { isAuthenticated } = useCustomerAuth();
    const tabs = [
        { to: `/${storeSlug}`, end: true, icon: 'store', label: t('الرئيسية') },
        { to: `/${storeSlug}/products`, icon: 'grid', label: t('المنتجات') },
        { to: `/${storeSlug}/cart`, icon: 'shopping-bag', label: t('السلة'), badge: count },
        { to: isAuthenticated ? `/${storeSlug}/account/orders` : `/${storeSlug}/account/login`, icon: 'user', label: t('حسابي') },
    ];

    return (
        <nav aria-label={t('التنقل السريع')} className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
            <ul className="grid grid-cols-4">
                {tabs.map((tab) => (
                    <li key={tab.label}>
                        <NavLink end={tab.end} to={tab.to} className={({ isActive }) => cn('flex flex-col items-center gap-1 py-2 text-2xs font-medium transition', isActive ? 'text-primary' : 'text-muted')}>
                            <span className="relative">
                                <Icon name={tab.icon} className="size-[22px]" />
                                {tab.badge > 0 && <span className="absolute -top-1.5 -end-2 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-3xs font-semibold text-white">{tab.badge > 99 ? '99+' : tab.badge}</span>}
                            </span>
                            {tab.label}
                        </NavLink>
                    </li>
                ))}
            </ul>
        </nav>
    );
}

/** The promises every page repeats: in the top bar and the footer band. */
function storePerks(store) {
    return [
        store?.payment_methods?.includes('cod') !== false && { icon: 'wallet', title: t('الدفع عند الاستلام'), text: t('ادفع لما طلبك يوصلك') },
        { icon: 'truck', title: t('شحن لكل المحافظات'), text: t('توصيل سريع لباب البيت') },
        { icon: 'shield-check', title: t('تسوّق آمن'), text: t('بياناتك ومدفوعاتك محمية') },
        store?.contact?.whatsapp && { icon: 'message-square', title: t('دعم على واتساب'), text: t('نرد على استفساراتك بسرعة') },
    ].filter(Boolean);
}

function StoreNotFound() {
    return (
        <div className="grid min-h-dvh place-items-center px-6 text-center">
            <div>
                <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-surface-3 text-muted">
                    <Icon name="store" className="size-8" />
                </span>
                <h1 className="mt-6 mk-page-title">{t('المتجر غير موجود')}</h1>
                <p className="mt-2 text-sm text-muted">{t('تأكد من الرابط، فقد يكون المتجر غير متاح حالياً.')}</p>
            </div>
        </div>
    );
}

const SOCIAL = {
    facebook: t('فيسبوك'),
    instagram: t('انستجرام'),
    tiktok: t('تيك توك'),
};

/** The store's phone, WhatsApp, email, address and social links, as the vendor set them. */
function StoreContact({ store }) {
    const { phone, whatsapp, email, address } = store.contact ?? {};
    const whatsappNumber = whatsapp?.replace(/^0/, '20').replace(/^\+/, '');

    return (
        <div className="mt-4 flex flex-col gap-2 text-sm">
            {phone && (
                <a href={`tel:${phone}`} className="ltr inline-flex items-center gap-2 self-start text-muted hover:text-primary">
                    <Icon name="phone" className="size-4" />
                    {phone}
                </a>
            )}
            {whatsapp && (
                <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 self-start font-medium text-success hover:underline">
                    <Icon name="phone" className="size-4" />
                    {t('راسلنا على واتساب')}
                </a>
            )}
            {email && (
                <a href={`mailto:${email}`} className="ltr inline-flex items-center gap-2 self-start text-muted hover:text-primary">
                    <Icon name="mail" className="size-4" />
                    {email}
                </a>
            )}
            {address && (
                <span className="inline-flex items-start gap-2 text-muted">
                    <Icon name="map-pin" className="mt-0.5 size-4 shrink-0" />
                    {address}
                </span>
            )}
            {Object.keys(store.social ?? {}).length > 0 && (
                <div className="mt-1 flex flex-wrap gap-2">
                    {Object.entries(store.social).map(([network, url]) => (
                        <a key={network} href={url} target="_blank" rel="noreferrer" className="rounded-lg border border-line px-2.5 py-1 text-xs text-ink-2 hover:border-primary hover:text-primary">
                            {SOCIAL[network] ?? network}
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * Public store shell at /{store-slug}: header with search and cart, category bar, footer.
 * Also captures referral codes (?ref=CODE) on any store page.
 */
export function StorefrontLayout() {
    const { storeSlug } = useParams();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const toast = useToast();
    const [home, setHome] = useState(null);
    const [missing, setMissing] = useState(false);

    useEffect(() => {
        let cancelled = false;

        setHome(null);
        setMissing(false);
        storefrontApi
            .home(storeSlug)
            .then((data) => !cancelled && setHome(data))
            .catch(() => !cancelled && setMissing(true));

        return () => {
            cancelled = true;
        };
    }, [storeSlug]);

    // Referral (?ref=) and coupon (?coupon=) links: remember them, then tidy the address bar.
    useEffect(() => {
        const ref = searchParams.get('ref');
        const coupon = searchParams.get('coupon');

        if (!ref && !coupon) {
            return;
        }

        if (ref) {
            captureReferral(storeSlug, ref);
        }

        if (coupon) {
            const code = captureCoupon(storeSlug, coupon);

            code && toast.success(t('تم حفظ كود الخصم {code}', { code }), t('سيُطبَّق تلقائياً عند إتمام الطلب.'));
        }

        setSearchParams(
            (previous) => {
                const next = new URLSearchParams(previous);

                next.delete('ref');
                next.delete('coupon');

                return next;
            },
            { replace: true },
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams, setSearchParams, storeSlug]);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [location.pathname]);

    useEffect(() => {
        captureClickIds(searchParams);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Pixels load once the store is known, then every page counts as a view.
    useEffect(() => {
        if (home?.store) {
            initTracking(storeSlug, home.store.tracking_pixels);
            trackPageView();
        }
    }, [home, storeSlug, location.pathname]);

    if (missing) {
        return <StoreNotFound />;
    }

    const store = home?.store;
    const categories = home?.categories ?? [];
    const perks = storePerks(store);
    const whatsappNumber = store?.contact?.whatsapp?.replace(/^0/, '20').replace(/^\+/, '');
    const categoryLinkClass = ({ isActive }) => cn('relative block px-3 py-3 text-sm font-medium whitespace-nowrap transition after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:transition', isActive ? 'text-primary after:bg-primary' : 'text-ink-2 after:bg-transparent hover:text-ink');

    return (
        <StorefrontContext.Provider value={{ storeSlug, ...home }}>
            <CustomerAuthProvider storeSlug={storeSlug}>
            <CartProvider storeSlug={storeSlug}>
                <div className="flex min-h-dvh flex-col bg-bg pb-16 md:pb-0">
                    <div className="bg-panel text-panel-text">
                        <div className="mx-auto flex h-9 max-w-7xl items-center justify-between gap-4 px-4 text-xs sm:px-6">
                            <p className="truncate font-medium">{store?.announcement || perks.map((perk) => perk.title).join('  •  ')}</p>
                            {whatsappNumber && (
                                <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer" className="hidden shrink-0 items-center gap-1.5 font-medium text-brand-green hover:text-white sm:inline-flex">
                                    <Icon name="message-square" className="size-3.5" />
                                    {t('راسلنا على واتساب')}
                                </a>
                            )}
                        </div>
                    </div>
                    {store && !store.accepting_orders && (
                        <p className="flex items-center justify-center gap-2 bg-warning-soft px-4 py-2 text-center text-sm font-medium text-warning">
                            <Icon name="info" className="size-4 shrink-0" />
                            {store.closed_message}
                        </p>
                    )}
                    <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur-xl">
                        <div className="mx-auto flex h-[72px] max-w-7xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
                            <Link to={`/${storeSlug}`} className="flex min-w-0 shrink-0 items-center gap-2.5">
                                {store ? <Avatar name={store.name} src={store.logo_url} size="md" /> : <Skeleton className="size-10 rounded-xl" />}
                                <span className="max-w-40 truncate text-lg font-semibold text-ink sm:max-w-56">{store?.name}</span>
                            </Link>
                            <SearchBox storeSlug={storeSlug} className="hidden flex-1 md:flex" />
                            <div className="ms-auto flex items-center gap-1 md:ms-0">
                                <LanguageToggle />
                                <ThemeToggle className="hidden sm:grid" />
                                <span className="hidden md:block">
                                    <AccountButton storeSlug={storeSlug} />
                                </span>
                                <Link to={`/${storeSlug}/account/wishlist`} className="hidden lg:block" aria-label={t('المفضلة')} title={t('المفضلة')}>
                                    <HeaderAction icon="heart" />
                                </Link>
                                <CartButton storeSlug={storeSlug} />
                            </div>
                        </div>
                        <div className="mx-auto max-w-7xl px-4 pb-3 sm:px-6 md:hidden">
                            <SearchBox storeSlug={storeSlug} className="flex" />
                        </div>
                        {categories.length > 0 && (
                            <nav aria-label={t('أقسام المتجر')} className="border-t border-line">
                                <ul className="mk-rail mx-auto flex max-w-7xl items-center overflow-x-auto px-2 sm:px-4">
                                    <li>
                                        <NavLink to={`/${storeSlug}/products`} className={(state) => cn(categoryLinkClass(state), 'flex items-center gap-1.5 font-semibold')}>
                                            <Icon name="grid" className="size-4" />
                                            {t('كل المنتجات')}
                                        </NavLink>
                                    </li>
                                    {categories.map((category) => (
                                        <li key={category.slug}>
                                            <NavLink to={`/${storeSlug}/c/${category.slug}`} className={categoryLinkClass}>
                                                {category.name}
                                            </NavLink>
                                        </li>
                                    ))}
                                </ul>
                            </nav>
                        )}
                    </header>

                    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
                        <Suspense fallback={<PageLoader />}>
                            <Outlet />
                        </Suspense>
                    </main>

                    <footer className="mt-12 bg-surface">
                        <div className="border-y border-line">
                            <ul className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-4">
                                {perks.map((perk) => (
                                    <li key={perk.title} className="flex items-center gap-3">
                                        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-brand-green ring-1 ring-primary/10 ring-inset">
                                            <Icon name={perk.icon} className="size-5" />
                                        </span>
                                        <span>
                                            <span className="block text-sm font-semibold text-ink">{perk.title}</span>
                                            <span className="block text-xs text-muted">{perk.text}</span>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
                            <div>
                                <div className="flex items-center gap-2.5">
                                    {store && <Avatar name={store.name} src={store.logo_url} size="md" />}
                                    <p className="text-lg font-semibold text-ink">{store?.name}</p>
                                </div>
                                <p className="mt-3 text-sm leading-relaxed text-muted">{store?.description || t('تسوّق بأمان والدفع عند الاستلام.')}</p>
                                {store && <StoreContact store={store} />}
                            </div>
                            {categories.length > 0 && (
                                <div>
                                    <p className="text-sm font-semibold text-ink">{t('الأقسام')}</p>
                                    <ul className="mt-3 flex flex-col gap-2.5 text-sm">
                                        {categories.slice(0, 6).map((category) => (
                                            <li key={category.slug}>
                                                <Link to={`/${storeSlug}/c/${category.slug}`} className="text-muted hover:text-primary">
                                                    {category.name}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            <div>
                                <p className="text-sm font-semibold text-ink">{t('حسابي')}</p>
                                <ul className="mt-3 flex flex-col gap-2.5 text-sm">
                                    <li>
                                        <Link to={`/${storeSlug}/account/orders`} className="text-muted hover:text-primary">
                                            {t('طلباتي')}
                                        </Link>
                                    </li>
                                    <li>
                                        <Link to={`/${storeSlug}/account/wishlist`} className="text-muted hover:text-primary">
                                            {t('المفضلة')}
                                        </Link>
                                    </li>
                                    <li>
                                        <Link to={`/${storeSlug}/cart`} className="text-muted hover:text-primary">
                                            {t('السلة')}
                                        </Link>
                                    </li>
                                    <li>
                                        <Link to={`/${storeSlug}/affiliates/login`} className="text-muted hover:text-primary">
                                            {t('دخول المسوقين')}
                                        </Link>
                                    </li>
                                </ul>
                            </div>
                            {store?.policies?.length > 0 && (
                                <div>
                                    <p className="text-sm font-semibold text-ink">{t('سياسات المتجر')}</p>
                                    <ul className="mt-3 flex flex-col gap-2.5 text-sm">
                                        {store.policies.map((policy) => (
                                            <li key={policy.key}>
                                                <Link to={`/${storeSlug}/policies/${policy.key}`} className="text-muted hover:text-primary">
                                                    {policy.title}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                        <div className="border-t border-line">
                            <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-4 text-xs text-muted sm:flex-row sm:px-6">
                                <span>{t('© {year} {store}. جميع الحقوق محفوظة.', { year: new Date().getFullYear(), store: store?.name ?? '' })}</span>
                                <span className="flex items-center gap-2">
                                    {t('مدعوم من')}
                                    <Logo className="h-2.5" />
                                </span>
                            </div>
                        </div>
                    </footer>
                    <MobileTabBar storeSlug={storeSlug} />
                </div>
            </CartProvider>
            </CustomerAuthProvider>
        </StorefrontContext.Provider>
    );
}
