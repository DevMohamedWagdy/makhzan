import { Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/brand/Logo';
import { Alert, Avatar } from '@/components/ui/Display';
import { Dropdown } from '@/components/ui/Dropdown';
import { Icon } from '@/components/ui/Icon';
import { PageLoader } from '@/components/ui/Spinner';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuth } from '@/context/AuthContext';
import { DashboardAlertsProvider, useDashboardAlerts } from '@/context/DashboardAlertsContext';
import { useToast } from '@/context/ToastContext';
import { notificationTarget } from '@/features/notifications/NotificationItem';
import { NotificationsMenu } from '@/features/notifications/NotificationsMenu';
import { useCopy } from '@/hooks/common';
import { authApi } from '@/services/authApi';
import { isRtl, t } from '@/i18n';
import { cn } from '@/lib/format';

/** The sidebar, grouped; each item shows only with its permission (see App\Support\StorePermissions). */
export const NAV_SECTIONS = [
    {
        title: t('الرئيسية'),
        items: [
            { label: t('لوحة التحكم'), icon: 'nav-dashboard', to: '/dashboard', end: true, permission: 'dashboard' },
            { label: t('الإشعارات'), icon: 'nav-notifications', to: '/dashboard/notifications', counter: 'unreadCount', permission: 'notifications' },
        ],
    },
    {
        title: t('المبيعات'),
        items: [
            { label: t('الطلبات'), icon: 'nav-orders', to: '/dashboard/orders', counter: 'pendingOrdersCount', permission: 'orders' },
            { label: t('المدفوعات'), icon: 'nav-payments', to: '/dashboard/payments', permission: 'payments' },
            { label: t('العملاء'), icon: 'nav-customers', to: '/dashboard/customers', permission: 'customers' },
            { label: t('التقييمات'), icon: 'nav-reviews', to: '/dashboard/reviews', permission: 'reviews' },
            { label: t('الشحن'), icon: 'nav-shipping', to: '/dashboard/shipping', permission: 'shipping' },
        ],
    },
    {
        title: t('الكتالوج'),
        items: [
            { label: t('المنتجات'), icon: 'nav-products', to: '/dashboard/products', permission: 'products' },
            { label: t('الأقسام'), icon: 'nav-categories', to: '/dashboard/categories', permission: 'categories' },
            { label: t('التصنيفات'), icon: 'nav-collections', to: '/dashboard/collections', permission: 'collections' },
        ],
    },
    {
        title: t('المخزون والمشتريات'),
        items: [
            { label: t('المخزون'), icon: 'nav-inventory', to: '/dashboard/inventory', permission: 'inventory' },
            { label: t('المخازن'), icon: 'nav-warehouses', to: '/dashboard/warehouses', permission: 'warehouses' },
            { label: t('أوامر الشراء'), icon: 'nav-purchase-orders', to: '/dashboard/purchase-orders', permission: 'purchasing' },
            { label: t('الموردين'), icon: 'nav-suppliers', to: '/dashboard/suppliers', permission: 'suppliers' },
        ],
    },
    {
        title: t('التسويق'),
        items: [
            { label: t('المسوقين'), icon: 'nav-affiliates', to: '/dashboard/affiliates', permission: 'affiliates' },
            { label: t('طلبات التحويل'), icon: 'nav-payouts', to: '/dashboard/payout-requests', counter: 'payoutRequestsCount', permission: 'payouts' },
            { label: t('الكوبونات'), icon: 'nav-coupons', to: '/dashboard/coupons', permission: 'coupons' },
            { label: t('برنامج النقاط'), icon: 'nav-loyalty', to: '/dashboard/loyalty', permission: 'loyalty' },
        ],
    },
    {
        title: t('الإدارة'),
        items: [
            { label: t('التقارير'), icon: 'nav-reports', to: '/dashboard/reports', permission: 'reports' },
            { label: t('فريق العمل'), icon: 'nav-staff', to: '/dashboard/staff', permission: 'owner' },
            { label: t('سجل النشاط'), icon: 'nav-activity', to: '/dashboard/activity', permission: 'activity' },
            { label: t('الدعم الفني'), icon: 'nav-support', to: '/dashboard/support', permission: 'support' },
            { label: t('إعدادات المتجر'), icon: 'nav-settings', to: '/dashboard/settings', permission: 'settings' },
        ],
    },
];

/**
 * The public storefront link customers order from. Sessions saved before the API returned
 * `store.url` fall back to this app's address.
 */
/**
 * The sidebar pages an account can open (the dashboard home excluded), in sidebar order:
 * where staff without the dashboard permission land, and the shortcuts on a limited home.
 */
export function allowedPages(can) {
    return NAV_SECTIONS.flatMap((section) => section.items).filter((item) => item.to !== '/dashboard' && (!item.permission || can(item.permission)));
}

function storefrontUrl(store) {
    return store?.url ?? `${window.location.origin}/${store?.slug ?? ''}`;
}

function Sidebar({ open, onClose }) {
    const { store, can } = useAuth();
    const visibleSections = NAV_SECTIONS.map((section) => ({ ...section, items: section.items.filter((item) => !item.permission || can(item.permission)) })).filter((section) => section.items.length > 0);
    const alerts = useDashboardAlerts();
    const toast = useToast();
    const { copy, copiedValue } = useCopy();
    const storeUrl = storefrontUrl(store);
    const copied = copiedValue === storeUrl;

    return (
        <>
            {open && <div className="animate-fade-in fixed inset-0 z-30 bg-[#0b1116]/55 backdrop-blur-[2px] lg:hidden" onClick={onClose} />}
            <aside
                className={cn(
                    'fixed inset-y-0 start-0 z-40 flex w-[264px] flex-col border-e border-line bg-surface transition-transform duration-300 lg:translate-x-0',
                    open ? 'translate-x-0' : isRtl ? 'translate-x-full' : '-translate-x-full',
                )}
                aria-label={t('القائمة الرئيسية')}
            >
                <div className="flex h-16 shrink-0 items-center justify-between px-5">
                    <Logo className="h-[18px]" />
                    <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-3 hover:text-ink lg:hidden" aria-label={t('إغلاق القائمة')}>
                        <Icon name="x" />
                    </button>
                </div>

                <div className="mx-3 mb-2 flex items-center gap-2.5 rounded-xl border border-line bg-surface-2 p-2">
                    <Avatar name={store?.name} src={store?.logo_url} size="sm" />
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] leading-5 font-semibold text-ink">{store?.name}</p>
                        <p className="ltr truncate text-start text-[11px] leading-4 text-muted" title={storeUrl}>
                            {storeUrl.replace(/^https?:\/\//, '')}
                        </p>
                    </div>
                    <a
                        href={storeUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={t('زيارة المتجر')}
                        title={t('زيارة المتجر')}
                        className="grid size-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-surface-3 hover:text-ink"
                    >
                        <Icon name="eye" className="size-4" />
                    </a>
                    <button
                        type="button"
                        onClick={() => {
                            copy(storeUrl);
                            toast.success(t('تم نسخ رابط المتجر'), t('شاركه مع عملائك ليطلبوا من متجرك مباشرة.'));
                        }}
                        aria-label={copied ? t('تم النسخ') : t('نسخ الرابط')}
                        title={copied ? t('تم النسخ') : t('نسخ الرابط')}
                        className={cn('grid size-8 shrink-0 place-items-center rounded-lg transition', copied ? 'text-brand-accent' : 'text-muted hover:bg-surface-3 hover:text-ink')}
                    >
                        <Icon name={copied ? 'check' : 'copy'} className="size-4" />
                    </button>
                </div>

                <SidebarNav sections={visibleSections} alerts={alerts} onNavigate={onClose} />
            </aside>
        </>
    );
}

/**
 * The sidebar's grouped links: shared by the vendor dashboard and the admin panel. The active
 * page gets a soft green highlight and a logo-green icon. `counter(item)` returns the badge number.
 */
export function SidebarNav({ sections, alerts = {}, counter, onNavigate }) {
    return (
        <nav className="mk-scroll flex-1 overflow-y-auto px-3 pt-2 pb-6">
            {sections.map((section) => (
                <div key={section.title} className="mt-5 first:mt-2">
                    <p className="mb-1 px-3 text-[11px] leading-5 font-medium text-muted">{section.title}</p>
                    <ul className="flex flex-col gap-px">
                        {section.items.map((item) => {
                            const count = counter ? counter(item) : item.counter ? alerts[item.counter] : 0;

                            return item.soon ? (
                                <li key={item.label}>
                                    <span className="flex h-9 cursor-not-allowed items-center gap-3 rounded-lg px-3 text-[13.5px] text-muted" title={t('هذه الوحدة قيد التطوير')}>
                                        <Icon name={item.icon} className="size-[18px]" />
                                        {item.label}
                                        <span className="ms-auto rounded-md bg-surface-3 px-1.5 py-0.5 text-[10px]">{t('قريباً')}</span>
                                    </span>
                                </li>
                            ) : (
                                <li key={item.label}>
                                    <NavLink
                                        to={item.to}
                                        end={item.end}
                                        onClick={onNavigate}
                                        className={({ isActive }) =>
                                            cn(
                                                'flex h-9 items-center gap-3 rounded-lg px-3 text-[13.5px] transition',
                                                isActive ? 'bg-primary-soft font-semibold text-ink [&>svg]:text-brand-accent' : 'text-ink-2 hover:bg-surface-2 hover:text-ink [&>svg]:text-muted',
                                            )
                                        }
                                    >
                                        <Icon name={item.icon} className="size-[18px] shrink-0" />
                                        <span className="truncate">{item.label}</span>
                                        {count > 0 && (
                                            <span className="mk-num ms-auto grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-white">
                                                {count > 99 ? '99+' : count}
                                            </span>
                                        )}
                                    </NavLink>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            ))}
        </nav>
    );
}

export function ImpersonationBanner() {
    const { impersonation, stopImpersonating } = useAuth();
    const navigate = useNavigate();

    if (!impersonation) {
        return null;
    }

    return (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 bg-warning px-4 py-2.5 text-sm font-medium text-[#1a1204]">
            <Icon name="eye" className="size-[18px]" />
            <span>
                {t('أنت تتصفح الآن بصفة المسوق {name} — كل الإجراءات تُسجل باسمك.', { name: impersonation.affiliate.full_name })}
            </span>
            <button
                type="button"
                onClick={() => {
                    stopImpersonating();
                    navigate('/dashboard/affiliates');
                }}
                className="rounded-lg bg-brand px-3 py-1 text-xs font-semibold text-white hover:bg-brand-light"
            >
                {t('العودة إلى حسابي')}
            </button>
        </div>
    );
}

/** The vendor dashboard: sidebar, header and the page. Counters are shared through DashboardAlertsProvider. */
export function DashboardLayout() {
    return (
        <DashboardAlertsProvider>
            <DashboardShell />
        </DashboardAlertsProvider>
    );
}

function DashboardShell() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { vendor, store, logout, isOwner, can, updateVendor } = useAuth();
    const { notifications, unreadCount, markRead, markAllRead } = useDashboardAlerts();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => setSidebarOpen(false), [location.pathname]);

    // Permissions change on the server (staff edits): refresh on load.
    useEffect(() => {
        authApi
            .me()
            .then(updateVendor)
            .catch(() => {});
    }, [updateVendor]);

    return (
        <div className="min-h-dvh">
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className="lg:ps-[264px]">
                <ImpersonationBanner />
                <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur-xl sm:px-8">
                    <button type="button" onClick={() => setSidebarOpen(true)} className="grid size-9 place-items-center rounded-lg border border-line-strong/70 bg-surface text-ink-2 shadow-card lg:hidden" aria-label={t('فتح القائمة')}>
                        <Icon name="menu" className="size-[18px]" />
                    </button>
                    <Logo className="h-4 lg:hidden" />
                    <div className="ms-auto flex items-center gap-1">
                        <LanguageToggle />
                        <ThemeToggle />
                        {can('notifications') && <NotificationsMenu notifications={notifications} unreadCount={unreadCount} markRead={markRead} markAllRead={markAllRead} target={notificationTarget} allHref="/dashboard/notifications" />}
                        <span className="mx-1.5 h-6 w-px bg-line" aria-hidden="true" />
                        <Dropdown
                            label={t('قائمة الحساب')}
                            trigger={(props) => (
                                <button type="button" {...props} className="flex items-center gap-2.5 rounded-xl p-1 pe-2 transition hover:bg-surface-3">
                                    <Avatar name={vendor?.full_name} size="sm" shape="circle" />
                                    <span className="hidden text-start leading-tight sm:block">
                                        <span className="block text-[13px] font-semibold text-ink">{vendor?.full_name}</span>
                                        <span className="block text-[11px] text-muted">{isOwner ? t('صاحب المتجر') : t('عضو فريق العمل')}</span>
                                    </span>
                                    <Icon name="chevron-down" className="hidden size-4 text-muted sm:block" />
                                </button>
                            )}
                            items={[
                                { label: t('الملف الشخصي'), icon: 'user', onClick: () => navigate('/dashboard/settings?tab=account') },
                                { label: t('إعدادات المتجر'), icon: 'settings', onClick: () => navigate('/dashboard/settings'), hidden: !can('settings') },
                                { divider: true },
                                {
                                    label: t('تسجيل الخروج'),
                                    icon: 'log-out',
                                    tone: 'danger',
                                    onClick: () => {
                                        logout();
                                        navigate('/login');
                                    },
                                },
                            ]}
                        />
                    </div>
                </header>
                <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-8 sm:py-8">
                    {store?.suspended && (
                        <Alert tone="danger" title={t('متجرك موقوف من إدارة المنصة')} className="mb-6">
                            {t('السبب: {reason}. لا يستطيع العملاء الطلب الآن. تواصل مع الدعم لإعادة تفعيله.', { reason: store.suspension_reason ?? '—' })}
                        </Alert>
                    )}
                    <Suspense fallback={<PageLoader />}>
                        <Outlet />
                    </Suspense>
                </main>
            </div>
        </div>
    );
}

export function PageHeader({ title, description, breadcrumbs = [], actions }) {
    return (
        <div className="mk-page-header mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
                {breadcrumbs.length > 0 && (
                    <nav aria-label={t('مسار التنقل')} className="mb-2 flex items-center gap-1.5 text-xs text-muted">
                        {breadcrumbs.map((crumb, index) => (
                            <span key={crumb} className="flex items-center gap-1.5">
                                {index > 0 && <Icon name="chevron-left" className="size-3 opacity-60" />}
                                <span className={index === breadcrumbs.length - 1 ? 'font-medium text-ink-2' : undefined}>{crumb}</span>
                            </span>
                        ))}
                    </nav>
                )}
                <h1 className="text-[22px] leading-8 font-semibold text-ink sm:text-[26px] sm:leading-9">{title}</h1>
                {description && <p className="mt-1 max-w-2xl text-[13.5px] leading-6 text-muted">{description}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}
