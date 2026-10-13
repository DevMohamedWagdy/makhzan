import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/brand/Logo';
import { Avatar } from '@/components/ui/Display';
import { Dropdown } from '@/components/ui/Dropdown';
import { Icon } from '@/components/ui/Icon';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuth } from '@/context/AuthContext';
import { DashboardAlertsProvider, useDashboardAlerts } from '@/context/DashboardAlertsContext';
import { useToast } from '@/context/ToastContext';
import { notificationTarget } from '@/features/notifications/NotificationItem';
import { NotificationsMenu } from '@/features/notifications/NotificationsMenu';
import { useCopy } from '@/hooks/common';
import { isRtl, t } from '@/i18n';
import { cn } from '@/lib/format';

const NAV_SECTIONS = [
    {
        title: t('الرئيسية'),
        items: [
            { label: t('لوحة التحكم'), icon: 'grid', to: '/dashboard', end: true },
            { label: t('الإشعارات'), icon: 'bell', to: '/dashboard/notifications', counter: 'unreadCount' },
        ],
    },
    {
        title: t('المبيعات'),
        items: [
            { label: t('الطلبات'), icon: 'shopping-bag', to: '/dashboard/orders', counter: 'pendingOrdersCount' },
            { label: t('المدفوعات'), icon: 'credit-card', to: '/dashboard/payments' },
            { label: t('العملاء'), icon: 'user', to: '/dashboard/customers' },
            { label: t('الشحن'), icon: 'truck', to: '/dashboard/shipping' },
        ],
    },
    {
        title: t('الكتالوج'),
        items: [
            { label: t('المنتجات'), icon: 'box', to: '/dashboard/products' },
            { label: t('الأقسام'), icon: 'grid', to: '/dashboard/categories' },
        ],
    },
    {
        title: t('المخزون والمشتريات'),
        items: [
            { label: t('المخزون'), icon: 'warehouse', to: '/dashboard/inventory' },
            { label: t('المخازن'), icon: 'building', to: '/dashboard/warehouses' },
            { label: t('أوامر الشراء'), icon: 'download', to: '/dashboard/purchase-orders' },
            { label: t('الموردين'), icon: 'users', to: '/dashboard/suppliers' },
        ],
    },
    {
        title: t('التسويق'),
        items: [
            { label: t('المسوقين'), icon: 'users', to: '/dashboard/affiliates' },
            { label: t('طلبات التحويل'), icon: 'send', to: '/dashboard/payout-requests', counter: 'payoutRequestsCount' },
            { label: t('الكوبونات'), icon: 'gift', to: '/dashboard/coupons' },
        ],
    },
    {
        title: t('الإدارة'),
        items: [
            { label: t('التقارير'), icon: 'bar-chart', to: '/dashboard/reports' },
            { label: t('إعدادات المتجر'), icon: 'settings', to: '/dashboard/settings' },
        ],
    },
];

/**
 * The public storefront link customers order from. Sessions saved before the API returned
 * `store.url` fall back to this app's address.
 */
function storefrontUrl(store) {
    return store?.url ?? `${window.location.origin}/${store?.slug ?? ''}`;
}

function Sidebar({ open, onClose }) {
    const { store } = useAuth();
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
                    <Logo className="h-9" />
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
                    {NAV_SECTIONS.map((section) => (
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

                <div className="m-4 rounded-xl bg-gradient-to-br from-indigo-600 to-sky-500 p-4 text-white">
                    <p className="text-sm font-semibold">{t('تحتاج مساعدة؟')}</p>
                    <p className="mt-1 text-xs leading-relaxed text-indigo-100">{t('فريق دعم مخزن متاح يومياً من ٩ صباحاً حتى ١٢ منتصف الليل.')}</p>
                </div>
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
    const { vendor, logout } = useAuth();
    const { notifications, unreadCount, markRead, markAllRead } = useDashboardAlerts();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => setSidebarOpen(false), [location.pathname]);

    return (
        <div className="min-h-dvh">
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className="lg:ps-[264px]">
                <ImpersonationBanner />
                <header className="sticky top-0 z-20 flex h-[72px] items-center gap-3 border-b border-line bg-surface/85 px-4 backdrop-blur-md sm:px-8">
                    <button type="button" onClick={() => setSidebarOpen(true)} className="grid size-10 place-items-center rounded-xl border border-line text-ink-2 lg:hidden" aria-label={t('فتح القائمة')}>
                        <Icon name="menu" />
                    </button>
                    <div className="relative hidden max-w-md flex-1 md:block">
                        <Icon name="search" className="pointer-events-none absolute start-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted" />
                        <input type="search" placeholder={t('ابحث في الطلبات، المنتجات، المسوقين...')} className="mk-input h-10 bg-surface-2 ps-10" aria-label={t('بحث عام')} />
                    </div>
                    <div className="ms-auto flex items-center gap-2">
                        <LanguageToggle />
                        <ThemeToggle />
                        <NotificationsMenu notifications={notifications} unreadCount={unreadCount} markRead={markRead} markAllRead={markAllRead} target={notificationTarget} allHref="/dashboard/notifications" />
                        <Dropdown
                            label={t('قائمة الحساب')}
                            trigger={(props) => (
                                <button type="button" {...props} className="flex items-center gap-2.5 rounded-xl p-1 pe-2 transition hover:bg-surface-3">
                                    <Avatar name={vendor?.full_name} size="sm" />
                                    <span className="hidden text-start sm:block">
                                        <span className="block text-sm font-semibold text-ink">{vendor?.full_name}</span>
                                        <span className="block text-xs text-muted">{t('صاحب المتجر')}</span>
                                    </span>
                                    <Icon name="chevron-down" className="hidden size-4 text-muted sm:block" />
                                </button>
                            )}
                            items={[
                                { label: t('الملف الشخصي'), icon: 'user', onClick: () => navigate('/dashboard/settings?tab=account') },
                                { label: t('إعدادات المتجر'), icon: 'store', onClick: () => navigate('/dashboard/settings') },
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
                    <Outlet />
                </main>
            </div>
        </div>
    );
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
