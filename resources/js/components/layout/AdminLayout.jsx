import { Suspense, useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/brand/Logo';
import { Avatar, Badge } from '@/components/ui/Display';
import { Icon } from '@/components/ui/Icon';
import { PageLoader } from '@/components/ui/Spinner';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { adminNotificationTarget } from '@/features/notifications/NotificationItem';
import { NotificationsMenu } from '@/features/notifications/NotificationsMenu';
import { isRtl, t } from '@/i18n';
import { cn } from '@/lib/format';
import { adminApi } from '@/services/adminApi';

const NAV_SECTIONS = [
    {
        title: t('المنصة'),
        items: [
            { label: t('نظرة عامة'), icon: 'grid', to: '/admin', end: true, permission: 'overview.view' },
            { label: t('الإشعارات'), icon: 'bell', to: '/admin/notifications', counter: true },
            { label: t('تذاكر الدعم'), icon: 'message-square', to: '/admin/support', permission: 'tickets.view' },
        ],
    },
    {
        title: t('التجار'),
        items: [
            { label: t('المتاجر'), icon: 'store', to: '/admin/stores', permission: 'stores.view' },
            { label: t('التجار والحسابات'), icon: 'users', to: '/admin/vendors', permission: 'vendors.view' },
        ],
    },
    {
        title: t('المبيعات'),
        items: [
            { label: t('الطلبات'), icon: 'shopping-bag', to: '/admin/orders', permission: 'orders.view' },
            { label: t('المدفوعات'), icon: 'credit-card', to: '/admin/payments', permission: 'payments.view' },
            { label: t('الكوبونات'), icon: 'percent', to: '/admin/coupons', permission: 'coupons.view' },
        ],
    },
    {
        title: t('العملاء والمسوّقين'),
        items: [
            { label: t('العملاء'), icon: 'user', to: '/admin/customers', permission: 'customers.view' },
            { label: t('المسوّقين'), icon: 'megaphone', to: '/admin/affiliates', permission: 'affiliates.view' },
            { label: t('تحويلات المسوّقين'), icon: 'wallet', to: '/admin/payouts', permission: 'affiliates.view' },
        ],
    },
    {
        title: t('الكتالوج'),
        items: [
            { label: t('المنتجات'), icon: 'box', to: '/admin/products', permission: 'products.view' },
            { label: t('التقييمات'), icon: 'star', to: '/admin/reviews', permission: 'reviews.view' },
        ],
    },
    {
        title: t('الإدارة'),
        items: [
            { label: t('سجل النشاط'), icon: 'clock', to: '/admin/logs', permission: 'logs.view' },
            { label: t('فريق الإدارة'), icon: 'shield-check', to: '/admin/team', permission: 'team.manage' },
            { label: t('إعدادات المنصة'), icon: 'settings', to: '/admin/settings', permission: 'settings.view' },
        ],
    },
];

const POLL_INTERVAL = 60_000;

/** The platform admin panel: its own sidebar, header and bell, separate from any store dashboard. */
export function AdminLayout() {
    const [open, setOpen] = useState(false);
    const { admin, logout, can, refresh } = useAdminAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => setOpen(false), [location.pathname]);

    useEffect(() => {
        refresh().catch(() => {});
    }, [refresh]);

    const loadNotifications = useCallback(() => {
        adminApi
            .notifications({ per_page: 8 })
            .then((result) => {
                setNotifications(result.data);
                setUnreadCount(result.summary.unread_count);
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        loadNotifications();
        const timer = setInterval(loadNotifications, POLL_INTERVAL);

        window.addEventListener('focus', loadNotifications);

        return () => {
            clearInterval(timer);
            window.removeEventListener('focus', loadNotifications);
        };
    }, [loadNotifications]);

    const markRead = async (notification) => {
        if (!notification.read_at) {
            await adminApi.markNotificationRead(notification.id).catch(() => {});
            loadNotifications();
        }
    };

    const markAllRead = async () => {
        await adminApi.markAllNotificationsRead().catch(() => {});
        loadNotifications();
    };

    const sections = NAV_SECTIONS.map((section) => ({ ...section, items: section.items.filter((item) => !item.permission || can(item.permission)) })).filter((section) => section.items.length > 0);

    return (
        <div className="min-h-dvh">
            {open && <div className="animate-fade-in fixed inset-0 z-30 bg-slate-950/50 lg:hidden" onClick={() => setOpen(false)} />}
            <aside
                className={cn('fixed inset-y-0 start-0 z-40 flex w-[248px] flex-col border-e border-line bg-surface transition-transform duration-300 lg:translate-x-0', open ? 'translate-x-0' : isRtl ? 'translate-x-full' : '-translate-x-full')}
                aria-label={t('قائمة الإدارة')}
            >
                <div className="flex h-[72px] items-center gap-2 border-b border-line px-6">
                    <Logo className="h-3.5" />
                    <Badge tone="primary">{t('الإدارة')}</Badge>
                </div>
                <nav className="mk-scroll flex-1 overflow-y-auto px-3 py-4">
                    {sections.map((section) => (
                        <div key={section.title} className="mb-5">
                            <p className="mb-2 px-3 text-[11px] font-semibold tracking-wide text-muted uppercase">{section.title}</p>
                            <ul className="flex flex-col gap-0.5">
                                {section.items.map((item) => (
                                    <li key={item.to}>
                                        <NavLink
                                            to={item.to}
                                            end={item.end}
                                            className={({ isActive }) => cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition', isActive ? 'bg-primary-soft text-primary' : 'text-ink-2 hover:bg-surface-3 hover:text-ink')}
                                        >
                                            <Icon name={item.icon} className="size-[18px]" />
                                            {item.label}
                                            {item.counter && unreadCount > 0 && <span className="ms-auto grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1.5 text-[11px] font-bold text-white">{unreadCount > 99 ? '99+' : unreadCount}</span>}
                                        </NavLink>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </nav>
            </aside>

            <div className="lg:ps-[248px]">
                <header className="sticky top-0 z-20 flex h-[72px] items-center gap-3 border-b border-line bg-surface/85 px-4 backdrop-blur-md sm:px-8">
                    <button type="button" onClick={() => setOpen(true)} className="grid size-10 place-items-center rounded-xl border border-line text-ink-2 lg:hidden" aria-label={t('فتح القائمة')}>
                        <Icon name="menu" />
                    </button>
                    <div className="ms-auto flex items-center gap-2">
                        <LanguageToggle />
                        <ThemeToggle />
                        <NotificationsMenu notifications={notifications} unreadCount={unreadCount} markRead={markRead} markAllRead={markAllRead} target={adminNotificationTarget} allHref="/admin/notifications" />
                        <span className="flex items-center gap-2.5 px-2">
                            <Avatar name={admin?.full_name} size="sm" />
                            <span className="hidden text-start sm:block">
                                <span className="block text-sm font-semibold text-ink">{admin?.full_name}</span>
                                <span className="block text-xs text-muted">{admin?.is_super !== false ? t('مدير عام') : (admin?.role ?? t('فريق الإدارة'))}</span>
                            </span>
                        </span>
                        <button
                            type="button"
                            onClick={() => {
                                logout();
                                navigate('/admin/login');
                            }}
                            className="grid size-10 place-items-center rounded-xl text-muted transition hover:bg-surface-3 hover:text-danger"
                            aria-label={t('تسجيل الخروج')}
                            title={t('تسجيل الخروج')}
                        >
                            <Icon name="log-out" />
                        </button>
                    </div>
                </header>
                <main className="px-4 py-6 sm:px-8 sm:py-8">
                    <Suspense fallback={<PageLoader />}>
                        <Outlet context={{ reloadNotifications: loadNotifications }} />
                    </Suspense>
                </main>
            </div>
        </div>
    );
}
