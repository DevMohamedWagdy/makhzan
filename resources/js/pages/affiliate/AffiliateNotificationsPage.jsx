import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Display';
import { Pagination, Tabs } from '@/components/ui/Navigation';
import { Skeleton } from '@/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';
import { useAffiliatePortal } from '@/features/affiliate-portal/AffiliatePortalLayout';
import { NotificationItem, affiliateNotificationTarget } from '@/features/notifications/NotificationItem';
import { t } from '@/i18n';
import { affiliatePortalApi } from '@/services/affiliatePortalApi';

/** Every affiliate notification (account, payouts, commissions), newest first, with an unread filter. */
export function AffiliateNotificationsPage() {
    const navigate = useNavigate();
    const toast = useToast();
    const { notifications } = useAffiliatePortal();
    const { unreadCount, markRead, markAllRead } = notifications;
    const [searchParams, setSearchParams] = useSearchParams();
    const filter = searchParams.get('filter') === 'unread' ? 'unread' : '';
    const page = Number(searchParams.get('page')) || 1;
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [attempt, setAttempt] = useState(0);

    // Reload when the bell's unread count changes (new notification or marked elsewhere).
    useEffect(() => {
        setError(null);
        affiliatePortalApi
            .notifications({ unread: filter === 'unread' ? 1 : undefined, page })
            .then(setResult)
            .catch((loadError) => setError(loadError.message));
    }, [filter, page, unreadCount, attempt]);

    const setQuery = (patch) => setSearchParams(Object.fromEntries(Object.entries({ filter, page, ...patch }).filter(([, value]) => value && value !== 1)), { replace: true });

    const readAll = async () => {
        try {
            await markAllRead();
        } catch (readError) {
            toast.error(t('تعذر تحديث الإشعارات'), readError.message);
        }
    };

    return (
        <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="mk-page-title">{t('الإشعارات')}</h1>
                    <p className="mt-1 text-sm text-muted">{t('تحويل الأرباح، حالة حسابك، والعمولات على طلباتك')}</p>
                </div>
                {unreadCount > 0 && markAllRead && (
                    <Button variant="secondary" icon="check" onClick={readAll}>
                        {t('تحديد الكل كمقروء')}
                    </Button>
                )}
            </div>

            <section className="mk-card overflow-hidden">
                <Tabs
                    tabs={[
                        { value: '', label: t('كل الإشعارات') },
                        { value: 'unread', label: t('غير المقروءة'), count: unreadCount },
                    ]}
                    value={filter}
                    onChange={(value) => setQuery({ filter: value, page: 1 })}
                    className="px-3"
                />
                <div className="p-3">
                    {error ? (
                        <EmptyState icon="alert-triangle" title={t('تعذر تحميل الإشعارات')} description={error} action={<Button variant="secondary" icon="refresh" onClick={() => setAttempt((value) => value + 1)}>{t('إعادة المحاولة')}</Button>} />
                    ) : !result ? (
                        <div className="flex flex-col gap-2">
                            {[0, 1, 2].map((index) => (
                                <Skeleton key={index} className="h-16 w-full" />
                            ))}
                        </div>
                    ) : result.data.length === 0 ? (
                        <EmptyState icon="bell" title={filter ? t('لا توجد إشعارات غير مقروءة') : t('لا توجد إشعارات بعد')} description={t('سيصلك هنا إشعار عند تحويل أرباحك، وعند كل طلب جديد أو تغيّر في عمولتك.')} />
                    ) : (
                        <div className="flex flex-col gap-1">
                            {result.data.map((notification) => (
                                <NotificationItem
                                    key={notification.id}
                                    notification={notification}
                                    onOpen={(item) => {
                                        markRead(item);
                                        navigate(affiliateNotificationTarget(item));
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>
                {result && result.meta.total > result.meta.per_page && (
                    <div className="border-t border-line px-4 py-3">
                        <Pagination meta={result.meta} onPageChange={(nextPage) => setQuery({ page: nextPage })} />
                    </div>
                )}
            </section>
        </>
    );
}
