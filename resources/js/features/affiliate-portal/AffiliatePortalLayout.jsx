import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useNavigate, useOutletContext } from 'react-router-dom';
import { Logo } from '@/components/brand/Logo';
import { ImpersonationBanner } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Alert, Avatar, EmptyState } from '@/components/ui/Display';
import { Dropdown } from '@/components/ui/Dropdown';
import { Icon } from '@/components/ui/Icon';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { Skeleton, PageLoader } from '@/components/ui/Spinner';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAffiliateAuth } from '@/context/AffiliateAuthContext';
import { affiliateNotificationTarget } from '@/features/notifications/NotificationItem';
import { NotificationsMenu } from '@/features/notifications/NotificationsMenu';
import { t } from '@/i18n';
import { cn } from '@/lib/format';
import { affiliatePortalApi } from '@/services/affiliatePortalApi';
import { ChangePasswordModal, RequestPayoutModal } from './PortalWidgets';
import { useAffiliateNotifications } from './useAffiliateNotifications';

const NAV = [
    { to: '/affiliate', label: t('الرئيسية'), icon: 'grid', end: true },
    { to: '/affiliate/orders', label: t('طلباتي'), icon: 'shopping-bag' },
    { to: '/affiliate/payouts', label: t('أرباحي وتحويلاتي'), icon: 'wallet' },
    { to: '/affiliate/links', label: t('روابط الإحالة'), icon: 'link' },
    { to: '/affiliate/notifications', label: t('الإشعارات'), icon: 'bell', counter: true },
    { to: '/affiliate/account', label: t('حسابي'), icon: 'user' },
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
 * The affiliate portal shell: header with the bell and account menu, a section per page
 * (overview, orders, payouts, links, notifications, account) and the shared modals. Pages
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
        <div className="min-h-dvh">
            <ImpersonationBanner />
            <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur-xl backdrop-saturate-150">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
                    <div className="flex min-w-0 items-center gap-3">
                        {store ? <Avatar name={store.name} src={store.logo_url} size="sm" /> : <Skeleton className="size-8 rounded-xl" />}
                        <div className="min-w-0">
                            <p className="truncate text-[13.5px] leading-5 font-semibold text-ink">{store?.name}</p>
                            <p className="mk-overline text-primary">{t('بوابة المسوقين')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <LanguageToggle />
                        <ThemeToggle />
                        <NotificationsMenu
                            notifications={notifications.notifications}
                            unreadCount={notifications.unreadCount}
                            markRead={notifications.markRead}
                            markAllRead={notifications.markAllRead}
                            target={affiliateNotificationTarget}
                            allHref="/affiliate/notifications"
                        />
                        {affiliate && <span className="mx-1.5 h-6 w-px bg-line" aria-hidden="true" />}
                        {affiliate && (
                            <Dropdown
                                label={t('قائمة الحساب')}
                                trigger={(props) => (
                                    <button type="button" {...props} className="flex items-center gap-2 rounded-xl p-1 pe-2 transition hover:bg-surface-3">
                                        <Avatar name={affiliate.full_name} src={affiliate.avatar_url} size="sm" shape="circle" />
                                        <span className="hidden text-[13px] font-semibold text-ink sm:block">{affiliate.full_name.split(' ')[0]}</span>
                                        <Icon name="chevron-down" className="hidden size-4 text-muted sm:block" />
                                    </button>
                                )}
                                items={[
                                    { label: t('حسابي'), icon: 'user', onClick: () => navigate('/affiliate/account') },
                                    { label: t('تغيير كلمة المرور'), icon: 'lock', onClick: () => setPasswordOpen(true), disabled: isImpersonating, hint: isImpersonating ? t('غير متاح أثناء الدخول بصفة المسوق') : undefined },
                                    { divider: true, hidden: isImpersonating },
                                    { label: t('تسجيل الخروج'), icon: 'log-out', tone: 'danger', onClick: signOut, hidden: isImpersonating },
                                ]}
                            />
                        )}
                    </div>
                </div>
                <nav className="mk-rail mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 sm:px-4" aria-label={t('أقسام بوابة المسوق')}>
                    {NAV.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            className={({ isActive }) =>
                                cn('-mb-px flex h-11 items-center gap-2 border-b-2 px-3 text-[13.5px] font-medium whitespace-nowrap transition', isActive ? 'border-primary text-ink [&>svg]:text-primary' : 'border-transparent text-muted hover:border-line-strong hover:text-ink')
                            }
                        >
                            <Icon name={item.icon} className="size-[18px]" />
                            {item.label}
                            {item.counter && notifications.unreadCount > 0 && (
                                <span className="mk-num grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1.5 text-[11px] font-semibold text-white">{notifications.unreadCount > 99 ? '99+' : notifications.unreadCount}</span>
                            )}
                        </NavLink>
                    ))}
                </nav>
            </header>

            <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
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
            </main>

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
            <footer className="pb-8 text-center">
                <Logo className="mx-auto h-4 opacity-50 grayscale transition hover:opacity-80 hover:grayscale-0" />
            </footer>
        </div>
    );
}

/** @returns {{ affiliate: object, reload: () => Promise<void>, isImpersonating: boolean, notifications: ReturnType<typeof useAffiliateNotifications>, openPasswordModal: () => void, openPayoutModal: () => void }} */
export function useAffiliatePortal() {
    return useOutletContext();
}
