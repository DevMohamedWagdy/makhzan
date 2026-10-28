import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, useNavigate, useOutletContext } from 'react-router-dom';
import { AppShell, SidebarContextCard } from '@/components/layout/AppShell';
import { ImpersonationBanner } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Alert, Avatar, EmptyState } from '@/components/ui/Display';
import { Skeleton, PageLoader } from '@/components/ui/Spinner';
import { useAffiliateAuth } from '@/context/AffiliateAuthContext';
import { affiliateNotificationTarget } from '@/features/notifications/NotificationItem';
import { NotificationsMenu } from '@/features/notifications/NotificationsMenu';
import { t } from '@/i18n';
import { affiliatePortalApi } from '@/services/affiliatePortalApi';
import { ChangePasswordModal, RequestPayoutModal } from './PortalWidgets';
import { useAffiliateNotifications } from './useAffiliateNotifications';

const NAV_SECTIONS = [
    {
        items: [
            { to: '/affiliate', label: t('الرئيسية'), icon: 'grid', end: true },
            { to: '/affiliate/orders', label: t('طلباتي'), icon: 'shopping-bag' },
            { to: '/affiliate/payouts', label: t('أرباحي وتحويلاتي'), icon: 'wallet' },
            { to: '/affiliate/links', label: t('روابط الإحالة'), icon: 'link' },
        ],
    },
    {
        title: t('الحساب'),
        items: [
            { to: '/affiliate/notifications', label: t('الإشعارات'), icon: 'bell', counter: true },
            { to: '/affiliate/account', label: t('حسابي'), icon: 'user' },
        ],
    },
];

function PortalSkeleton() {
    return (
        <div className="flex flex-col gap-6">
            <Skeleton className="h-10 w-64" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[0, 1, 2, 3].map((index) => (
                    <Skeleton key={index} className="h-24 rounded-xl" />
                ))}
            </div>
            <Skeleton className="h-64 rounded-xl" />
        </div>
    );
}

/**
 * The affiliate portal shell (the shared AppShell): the store card, a page per section (overview, orders,
 * payouts, links, notifications, account), the bell and account menu, and the shared modals. Pages
 * read the affiliate through useAffiliatePortal(). Also what a vendor sees when
 * impersonating, in which case account actions are read-only.
 */
export function AffiliatePortalLayout() {
    const navigate = useNavigate();
    const { logout, isImpersonating, storeSlug } = useAffiliateAuth();
    const [affiliate, setAffiliate] = useState(null);
    const [loadError, setLoadError] = useState(null);
    const [passwordOpen, setPasswordOpen] = useState(false);
    const [payoutOpen, setPayoutOpen] = useState(false);
    const notifications = useAffiliateNotifications({ readOnly: isImpersonating });
    const refreshNotifications = notifications.refresh;

    const reload = useCallback(() => {
        setLoadError(null);

        return affiliatePortalApi
            .me()
            .then((data) => {
                setAffiliate(data);
                document.title = t('لوحة المسوق | {name}', { name: data.store.name });
            })
            .catch((error) => setLoadError(error.message));
    }, []);

    useEffect(() => {
        reload();
    }, [reload]);

    // A new notification usually means the balance or stats changed too.
    useEffect(() => {
        if (notifications.unreadCount > 0) {
            reload();
        }
    }, [notifications.unreadCount, reload]);

    const signOut = () => {
        const slug = affiliate?.store.slug ?? storeSlug;

        logout();
        navigate(slug ? `/${slug}/affiliates/login` : '/affiliate', { replace: true });
    };

    const context = useMemo(
        () => ({
            affiliate,
            reload,
            isImpersonating,
            notifications,
            openPasswordModal: () => setPasswordOpen(true),
            openPayoutModal: () => setPayoutOpen(true),
        }),
        [affiliate, reload, isImpersonating, notifications],
    );

    const store = affiliate?.store;

    return (
        <AppShell
            navLabel={t('أقسام بوابة المسوق')}
            contextCard={
                <SidebarContextCard
                    avatar={store ? <Avatar name={store.name} src={store.logo_url} size="md" /> : <Skeleton className="size-10 rounded-xl" />}
                    title={store?.name}
                    status={t('بوابة المسوقين')}
                />
            }
            sections={NAV_SECTIONS}
            counter={(item) => (item.counter ? notifications.unreadCount : 0)}
            banner={<ImpersonationBanner />}
            headerTools={
                <NotificationsMenu
                    notifications={notifications.notifications}
                    unreadCount={notifications.unreadCount}
                    markRead={notifications.markRead}
                    markAllRead={notifications.markAllRead}
                    target={affiliateNotificationTarget}
                    allHref="/affiliate/notifications"
                />
            }
            account={
                affiliate && {
                    name: affiliate.full_name,
                    avatar: affiliate.avatar_url,
                    subtitle: t('مسوق'),
                    items: [
                        { label: t('حسابي'), icon: 'user', onClick: () => navigate('/affiliate/account') },
                        { label: t('تغيير كلمة المرور'), icon: 'lock', onClick: () => setPasswordOpen(true), disabled: isImpersonating, hint: isImpersonating ? t('غير متاح أثناء الدخول بصفة المسوق') : undefined },
                        { divider: true, hidden: isImpersonating },
                        { label: t('تسجيل الخروج'), icon: 'log-out', tone: 'danger', onClick: signOut, hidden: isImpersonating },
                    ],
                }
            }
        >
            {loadError && !affiliate ? (
                <EmptyState icon="alert-triangle" title={t('تعذر تحميل بياناتك')} description={loadError} action={<Button variant="secondary" icon="refresh" onClick={reload}>{t('إعادة المحاولة')}</Button>} />
            ) : !affiliate ? (
                <PortalSkeleton />
            ) : (
                <div className="flex flex-col gap-6">
                    {affiliate.status !== 'active' && (
                        <Alert tone="danger" icon="snowflake" title={t('هذا الحساب غير نشط')}>
                            {t('روابط الإحالة معطلة حالياً. تعرض هذه الصفحة البيانات كما يراها المسوق.')}
                        </Alert>
                    )}
                    <Suspense fallback={<PageLoader />}>
                        <Outlet context={context} />
                    </Suspense>
                </div>
            )}

            <ChangePasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
            {affiliate && (
                <RequestPayoutModal
                    affiliate={affiliate}
                    open={payoutOpen}
                    onClose={() => setPayoutOpen(false)}
                    onRequested={() => {
                        setPayoutOpen(false);
                        reload();
                        refreshNotifications();
                    }}
                />
            )}
        </AppShell>
    );
}

/** @returns {{ affiliate: object, reload: () => Promise<void>, isImpersonating: boolean, notifications: ReturnType<typeof useAffiliateNotifications>, openPasswordModal: () => void, openPayoutModal: () => void }} */
export function useAffiliatePortal() {
    return useOutletContext();
}
