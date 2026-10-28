import { Suspense, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { AppShell, SidebarCardAction, SidebarContextCard } from '@/components/layout/AppShell';
import { Alert, Avatar } from '@/components/ui/Display';
import { Icon } from '@/components/ui/Icon';
import { PageLoader } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { DashboardAlertsProvider, useDashboardAlerts } from '@/context/DashboardAlertsContext';
import { useToast } from '@/context/ToastContext';
import { notificationTarget } from '@/features/notifications/NotificationItem';
import { NotificationsMenu } from '@/features/notifications/NotificationsMenu';
import { useCopy } from '@/hooks/common';
import { authApi } from '@/services/authApi';
import { t } from '@/i18n';

/** The sidebar, grouped; each item shows only with its permission (see App\Support\StorePermissions). */
export const NAV_SECTIONS = [
    {
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

/** The store under the brand: its logo, name and whether it's live, with "visit" and "copy link" underneath. */
function StoreCard() {
    const { store } = useAuth();
    const toast = useToast();
    const { copy, copiedValue } = useCopy();
    const storeUrl = storefrontUrl(store);
    const copied = copiedValue === storeUrl;

    return (
        <SidebarContextCard
            avatar={<Avatar name={store?.name} src={store?.logo_url} size="md" />}
            title={store?.name}
            status={store?.suspended ? t('المتجر موقوف') : t('المتجر نشط')}
            statusTone={store?.suspended ? 'danger' : 'success'}
            actions={
                <>
                    <SidebarCardAction icon="external-link" label={t('زيارة المتجر')} href={storeUrl} />
                    <SidebarCardAction
                        icon={copied ? 'check' : 'copy'}
                        label={copied ? t('تم النسخ') : t('نسخ الرابط')}
                        isDone={copied}
                        onClick={() => {
                            copy(storeUrl);
                            toast.success(t('تم نسخ رابط المتجر'), t('شاركه مع عملائك ليطلبوا من متجرك مباشرة.'));
                        }}
                    />
                </>
            }
        />
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
    const { vendor, store, logout, isOwner, can, updateVendor } = useAuth();
    const alerts = useDashboardAlerts();
    const { notifications, unreadCount, markRead, markAllRead } = alerts;
    const navigate = useNavigate();
    const sections = NAV_SECTIONS.map((section) => ({ ...section, items: section.items.filter((item) => !item.permission || can(item.permission)) })).filter((section) => section.items.length > 0);

    // Permissions change on the server (staff edits): refresh on load.
    useEffect(() => {
        authApi
            .me()
            .then(updateVendor)
            .catch(() => {});
    }, [updateVendor]);

    return (
        <AppShell
            navLabel={t('القائمة الرئيسية')}
            contextCard={<StoreCard />}
            sections={sections}
            alerts={alerts}
            banner={<ImpersonationBanner />}
            headerTools={can('notifications') && <NotificationsMenu notifications={notifications} unreadCount={unreadCount} markRead={markRead} markAllRead={markAllRead} target={notificationTarget} allHref="/dashboard/notifications" />}
            account={{
                name: vendor?.full_name,
                subtitle: isOwner ? t('صاحب المتجر') : t('عضو فريق العمل'),
                items: [
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
                ],
            }}
        >
            {store?.suspended && (
                <Alert tone="danger" title={t('متجرك موقوف من إدارة المنصة')} className="mb-6">
                    {t('السبب: {reason}. لا يستطيع العملاء الطلب الآن. تواصل مع الدعم لإعادة تفعيله.', { reason: store.suspension_reason ?? '—' })}
                </Alert>
            )}
            <Suspense fallback={<PageLoader />}>
                <Outlet />
            </Suspense>
        </AppShell>
    );
}

/** A page's title row: breadcrumbs, an optional icon tile, the title and a line under it, and the page actions. */
export function PageHeader({ title, description, breadcrumbs = [], icon, actions }) {
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
                <div className="flex items-center gap-3.5">
                    {icon && (
                        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary ring-1 ring-primary/15 ring-inset">
                            <Icon name={icon} className="size-[22px]" />
                        </span>
                    )}
                    <div className="min-w-0">
                        <h1 className="mk-page-title">{title}</h1>
                        {description && <p className="mt-0.5 max-w-2xl text-sm text-muted">{description}</p>}
                    </div>
                </div>
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}
