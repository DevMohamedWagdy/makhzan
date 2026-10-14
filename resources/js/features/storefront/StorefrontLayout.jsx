import { Suspense, createContext, useContext, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { LogoMark } from '@/components/brand/Logo';
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

const StorefrontContext = createContext(null);

/** `{ storeSlug, store, categories, featured, latest }` from the store home endpoint. */
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
            className={cn('relative', className)}
            onSubmit={(event) => {
                event.preventDefault();
                term.trim() && navigate(`/${storeSlug}/search?q=${encodeURIComponent(term.trim())}`);
            }}
        >
            <Icon name="search" className="pointer-events-none absolute start-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted" />
            <input type="search" value={term} onChange={(event) => setTerm(event.target.value)} placeholder={t('ابحث عن منتج...')} aria-label={t('بحث في المتجر')} className="mk-input h-10 rounded-full bg-surface-2 ps-10" />
        </form>
    );
}

function CartButton({ storeSlug }) {
    const { count } = useCart();

    return (
        <Link to={`/${storeSlug}/cart`} className="relative grid size-10 place-items-center rounded-xl border border-line bg-surface text-ink-2 transition hover:border-line-strong hover:text-ink" aria-label={t('السلة ({count})', { count })} title={t('السلة')}>
            <Icon name="shopping-bag" />
            {count > 0 && <span className="absolute -top-1.5 -end-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-white ring-2 ring-surface">{count > 99 ? '99+' : count}</span>}
        </Link>
    );
}

function AccountButton({ storeSlug }) {
    const { customer, isAuthenticated, logout } = useCustomerAuth();
    const { store } = useStorefront();
    const navigate = useNavigate();
    const buttonClass = 'grid size-10 place-items-center rounded-xl border border-line bg-surface text-ink-2 transition hover:border-line-strong hover:text-ink';

    if (!isAuthenticated) {
        return (
            <Link to={`/${storeSlug}/account/login`} className={buttonClass} aria-label={t('تسجيل الدخول')} title={t('تسجيل الدخول')}>
                <Icon name="user" />
            </Link>
        );
    }

    return (
        <Dropdown
            label={t('حسابي')}
            trigger={(props) => (
                <button type="button" {...props} className={buttonClass} title={customer?.full_name}>
                    <Avatar name={customer?.full_name} size="sm" className="size-8" />
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

function StoreNotFound() {
    return (
        <div className="grid min-h-dvh place-items-center px-6 text-center">
            <div>
                <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-surface-3 text-muted">
                    <Icon name="store" className="size-8" />
                </span>
                <h1 className="mt-6 text-2xl font-bold text-ink">{t('المتجر غير موجود')}</h1>
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

    if (missing) {
        return <StoreNotFound />;
    }

    const store = home?.store;
    const categories = home?.categories ?? [];

    return (
        <StorefrontContext.Provider value={{ storeSlug, ...home }}>
            <CustomerAuthProvider storeSlug={storeSlug}>
            <CartProvider storeSlug={storeSlug}>
                <div className="flex min-h-dvh flex-col bg-surface-2/40">
                    {store?.announcement && <p className="bg-primary px-4 py-2 text-center text-sm font-medium text-white">{store.announcement}</p>}
                    {store && !store.accepting_orders && (
                        <p className="flex items-center justify-center gap-2 bg-warning-soft px-4 py-2 text-center text-sm font-medium text-warning">
                            <Icon name="info" className="size-4 shrink-0" />
                            {store.closed_message}
                        </p>
                    )}
                    <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur-md">
                        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
                            <Link to={`/${storeSlug}`} className="flex min-w-0 items-center gap-2.5">
                                {store ? <Avatar name={store.name} src={store.logo_url} size="md" /> : <Skeleton className="size-10 rounded-xl" />}
                                <span className="truncate text-lg font-bold text-ink">{store?.name}</span>
                            </Link>
                            <SearchBox storeSlug={storeSlug} className="mx-auto hidden w-full max-w-md md:block" />
                            <div className="ms-auto flex items-center gap-2 md:ms-0">
                                <LanguageToggle />
                                <ThemeToggle className="hidden sm:grid" />
                                <AccountButton storeSlug={storeSlug} />
                                <CartButton storeSlug={storeSlug} />
                            </div>
                        </div>
                        <div className="mx-auto max-w-7xl px-4 pb-3 sm:px-6 md:hidden">
                            <SearchBox storeSlug={storeSlug} />
                        </div>
                        {categories.length > 0 && (
                            <nav aria-label={t('أقسام المتجر')} className="border-t border-line">
                                <ul className="mk-scroll mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2 sm:px-6">
                                    <li>
                                        <NavLink end to={`/${storeSlug}`} className={({ isActive }) => cn('block rounded-full px-4 py-1.5 text-sm whitespace-nowrap transition', isActive ? 'bg-primary text-white' : 'text-ink-2 hover:bg-surface-3')}>
                                            {t('الرئيسية')}
                                        </NavLink>
                                    </li>
                                    {categories.map((category) => (
                                        <li key={category.slug}>
                                            <NavLink to={`/${storeSlug}/c/${category.slug}`} className={({ isActive }) => cn('block rounded-full px-4 py-1.5 text-sm whitespace-nowrap transition', isActive ? 'bg-primary text-white' : 'text-ink-2 hover:bg-surface-3')}>
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

                    <footer className="border-t border-line bg-surface">
                        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
                            <div>
                                <p className="text-lg font-bold text-ink">{store?.name}</p>
                                <p className="mt-2 text-sm leading-relaxed text-muted">{store?.description || t('تسوّق بأمان والدفع عند الاستلام.')}</p>
                                {store && <StoreContact store={store} />}
                            </div>
                            {categories.length > 0 && (
                                <div>
                                    <p className="text-sm font-semibold text-ink">{t('الأقسام')}</p>
                                    <ul className="mt-3 flex flex-col gap-2 text-sm">
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
                                <ul className="mt-3 flex flex-col gap-2 text-sm">
                                    <li>
                                        <Link to={`/${storeSlug}/account/orders`} className="text-muted hover:text-primary">
                                            {t('طلباتي')}
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
                                    <ul className="mt-3 flex flex-col gap-2 text-sm">
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
                        <div className="flex items-center justify-center gap-2 border-t border-line py-4 text-xs text-muted">
                            <LogoMark className="size-5" />
                            {t('مدعوم من منصة مخزن')}
                        </div>
                    </footer>
                </div>
            </CartProvider>
            </CustomerAuthProvider>
        </StorefrontContext.Provider>
    );
}
