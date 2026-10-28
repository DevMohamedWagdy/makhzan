import { Suspense, useCallback, useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { PageLoader } from '@/components/ui/Spinner';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { adminNotificationTarget } from '@/features/notifications/NotificationItem';
import { NotificationsMenu } from '@/features/notifications/NotificationsMenu';
import { t } from '@/i18n';
import { adminApi } from '@/services/adminApi';

const NAV_SECTIONS = [
    {
        items: [
            { label: t('الرئيسية'), icon: 'grid', to: '/admin', end: true, permission: 'overview.view' },
            { label: t('الإشعارات'), icon: 'bell', to: '/admin/notifications', counter: true },
        ],
    },
    {
        title: t('الدعم والتواصل'),
        items: [
            { label: t('تذاكر الدعم'), icon: 'message-square', to: '/admin/support', permission: 'tickets.view' },
            { label: t('رسائل التواصل'), icon: 'mail', to: '/admin/messages', permission: 'messages.view' },
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
            { label: t('المحافظات والمدن'), icon: 'map-pin', to: '/admin/locations', permission: 'locations.view' },
            { label: t('إعدادات المنصة'), icon: 'settings', to: '/admin/settings', permission: 'settings.view' },
        ],
    },
];

const POLL_INTERVAL = 60_000;

/** The platform admin panel: its own sidebar, header and bell, separate from any store dashboard. */
export function AdminLayout() {
    const { admin, logout, can, refresh } = useAdminAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const navigate = useNavigate();

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
        <AppShell
            navLabel={t('قائمة الإدارة')}
            brandTag={t('الإدارة')}
            sections={sections}
            counter={(item) => (item.counter ? unreadCount : 0)}
            headerTools={<NotificationsMenu notifications={notifications} unreadCount={unreadCount} markRead={markRead} markAllRead={markAllRead} target={adminNotificationTarget} allHref="/admin/notifications" />}
            account={{
                name: admin?.full_name,
                subtitle: admin?.is_super !== false ? t('مدير عام') : (admin?.role ?? t('فريق الإدارة')),
                items: [
                    {
                        label: t('تسجيل الخروج'),
                        icon: 'log-out',
                        tone: 'danger',
                        onClick: () => {
                            logout();
                            navigate('/admin/login');
                        },
                    },
                ],
            }}
        >
            <Suspense fallback={<PageLoader />}>
                <Outlet context={{ reloadNotifications: loadNotifications }} />
            </Suspense>
        </AppShell>
    );
}
