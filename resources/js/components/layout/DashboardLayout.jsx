import { Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
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
            { label: t('الاشتراك والباقة'), icon: 'nav-subscription', to: '/dashboard/subscription', permission: 'billing' },
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
            {open && <div className="animate-fade-in fixed inset-0 z-30 bg-slate-950/50 lg:hidden" onClick={onClose} />}
            <aside
                className={cn(
                    'fixed inset-y-0 start-0 z-40 flex w-[264px] flex-col border-e border-line bg-surface transition-transform duration-300 lg:translate-x-0',
                    open ? 'translate-x-0' : isRtl ? 'translate-x-full' : '-translate-x-full',
                )}
                aria-label={t('القائمة الرئيسية')}
            >
                <div className="flex h-[72px] items-center justify-between border-b border-line px-6">
                    <Logo className="h-4" />
                    <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-3 lg:hidden" aria-label={t('إغلاق القائمة')}>
                        <Icon name="x" />
                    </button>
                </div>

                <div className="border-b border-line p-4">
                    <div className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
                        <Avatar name={store?.name} src={store?.logo_url} size="md" />
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ink">{store?.name}</p>
                            <p className="ltr truncate text-start text-xs text-muted" title={storeUrl}>
                                {storeUrl.replace(/^https?:\/\//, '')}
                            </p>
                        </div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                        <a
                            href={storeUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-2 text-xs font-medium text-ink transition hover:bg-surface-3"
                        >
                            <Icon name="eye" className="size-3.5" />
                            {t('زيارة المتجر')}
                        </a>
                        <button
                            type="button"
                            onClick={() => {
                                copy(storeUrl);
                                toast.success(t('تم نسخ رابط المتجر'), t('شاركه مع عملائك ليطلبوا من متجرك مباشرة.'));
                            }}
                            className={cn(
                                'inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-medium transition',
                                copied ? 'bg-success-soft text-success' : 'bg-primary-soft text-primary hover:bg-primary/15',
                            )}
                        >
                            <Icon name={copied ? 'check' : 'copy'} className="size-3.5" />
                            {copied ? t('تم النسخ') : t('نسخ الرابط')}
                        </button>
                    </div>
                </div>

                <nav className="mk-scroll flex-1 overflow-y-auto px-3 py-4">
                    {visibleSections.map((section) => (
                        <div key={section.title} className="mb-5">
                            <p className="mb-2 px-3 text-[11px] font-semibold tracking-wide text-muted uppercase">{section.title}</p>
                            <ul className="flex flex-col gap-0.5">
                                {section.items.map((item) =>
                                    item.soon ? (
                                        <li key={item.label}>
                                            <span className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted" title={t('هذه الوحدة قيد التطوير')}>
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
                                                onClick={onClose}
                                                className={({ isActive }) =>
                                                    cn(
                                                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                                                        isActive ? 'bg-primary-soft text-primary' : 'text-ink-2 hover:bg-surface-3 hover:text-ink',
                                                    )
                                                }
                                            >
                                                <Icon name={item.icon} className="size-[18px]" />
                                                {item.label}
                                                {item.counter && alerts[item.counter] > 0 && (
                                                    <span className="ms-auto grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1.5 text-[11px] font-bold text-white">
                                                        {alerts[item.counter] > 99 ? '99+' : alerts[item.counter]}
                                                    </span>
                                                )}
                                            </NavLink>
                                        </li>
                                    ),
                                )}
                            </ul>
                        </div>
                    ))}
                </nav>
            </aside>
        </>
    );
}

export function ImpersonationBanner() {
    const { impersonation, stopImpersonating } = useAuth();
    const navigate = useNavigate();

    if (!impersonation) {
        return null;
    }

    return (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 bg-warning px-4 py-2.5 text-sm font-medium text-slate-950">
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
                className="rounded-lg bg-slate-950 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800"
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

    // Permissions and billing change on the server (staff edits, trial ending): refresh on load.
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
                <header className="sticky top-0 z-20 flex h-[72px] items-center gap-3 border-b border-line bg-surface/85 px-4 backdrop-blur-md sm:px-8">
                    <button type="button" onClick={() => setSidebarOpen(true)} className="grid size-10 place-items-center rounded-xl border border-line text-ink-2 lg:hidden" aria-label={t('فتح القائمة')}>
                        <Icon name="menu" />
                    </button>
                    <div className="ms-auto flex items-center gap-2">
                        <LanguageToggle />
                        <ThemeToggle />
                        {can('notifications') && <NotificationsMenu notifications={notifications} unreadCount={unreadCount} markRead={markRead} markAllRead={markAllRead} target={notificationTarget} allHref="/dashboard/notifications" />}
                        <Dropdown
                            label={t('قائمة الحساب')}
                            trigger={(props) => (
                                <button type="button" {...props} className="flex items-center gap-2.5 rounded-xl p-1 pe-2 transition hover:bg-surface-3">
                                    <Avatar name={vendor?.full_name} size="sm" />
                                    <span className="hidden text-start sm:block">
                                        <span className="block text-sm font-semibold text-ink">{vendor?.full_name}</span>
                                        <span className="block text-xs text-muted">{isOwner ? t('صاحب المتجر') : t('عضو فريق العمل')}</span>
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
                <main className="px-4 py-6 sm:px-8 sm:py-8">
                    <BillingBanner billing={store?.billing} isOwner={isOwner} />
                    {store?.suspended && (
                        <Alert tone="danger" title={t('متجرك موقوف من إدارة المنصة')} className="mb-6">
                            {t('السبب: {reason}. لا يستطيع العملاء الطلب الآن. تواصل مع الدعم، أو جدّد اشتراكك من صفحة الاشتراك إن كان السبب انتهاء الباقة.', { reason: store.suspension_reason ?? '—' })}
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

/** Trial days left, or that the trial/subscription ended (the owner gets a link to subscribe). */
function BillingBanner({ billing, isOwner }) {
    const location = useLocation();

    if (!billing || location.pathname === '/dashboard/subscription') {
        return null;
    }

    const action = isOwner && (
        <Button to="/dashboard/subscription" size="sm" icon="zap" className="shrink-0">
            {t('اختر باقة')}
        </Button>
    );

    if (billing.status === 'expired') {
        return (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
                <span>{isOwner ? t('انتهت الفترة التجريبية. اختر باقة لتفتح لوحة التحكم ويستقبل متجرك الطلبات من جديد.') : t('انتهت الفترة التجريبية للمتجر. اطلب من صاحب المتجر اختيار باقة.')}</span>
                {action}
            </div>
        );
    }

    if (billing.status === 'trial') {
        return (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary-soft px-4 py-3 text-sm text-primary">
                <span>{t('أنت في الفترة التجريبية المجانية: متبقي {days} يوم لاستخدام كل مميزات المنصة.', { days: billing.days_left })}</span>
                {action}
            </div>
        );
    }

    return null;
}

export function PageHeader({ title, description, breadcrumbs = [], actions }) {
    return (
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
                {breadcrumbs.length > 0 && (
                    <nav aria-label={t('مسار التنقل')} className="mb-2 flex items-center gap-1.5 text-xs text-muted">
                        {breadcrumbs.map((crumb, index) => (
                            <span key={crumb} className="flex items-center gap-1.5">
                                {index > 0 && <Icon name="chevron-left" className="size-3" />}
                                <span className={index === breadcrumbs.length - 1 ? 'text-ink-2' : undefined}>{crumb}</span>
                            </span>
                        ))}
                    </nav>
                )}
                <h1 className="text-2xl font-bold text-ink">{title}</h1>
                {description && <p className="mt-1 text-sm text-muted">{description}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}
