import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Display';
import { Pagination, Tabs } from '@/components/ui/Navigation';
import { Skeleton } from '@/components/ui/Spinner';
import { useDashboardAlerts } from '@/context/DashboardAlertsContext';
import { useToast } from '@/context/ToastContext';
import { NotificationItem, notificationTarget } from '@/features/notifications/NotificationItem';
import { notificationsApi } from '@/services/notificationsApi';

/** Every vendor notification, newest first, with an unread filter. */
export function NotificationsPage() {
    const navigate = useNavigate();
    const toast = useToast();
    const { unreadCount, markRead, markAllRead } = useDashboardAlerts();
    const [searchParams, setSearchParams] = useSearchParams();
    const filter = searchParams.get('filter') === 'unread' ? 'unread' : '';
    const page = Number(searchParams.get('page')) || 1;
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const load = useCallback(() => {
        setError(null);
        notificationsApi
            .list({ unread: filter === 'unread' ? 1 : undefined, page })
            .then(setResult)
            .catch((loadError) => setError(loadError.message));
    }, [filter, page]);

    // Reload when the bell's unread count changes (new notification or marked elsewhere).
    useEffect(load, [load, unreadCount]);

    const setQuery = (patch) => setSearchParams(Object.fromEntries(Object.entries({ filter, page, ...patch }).filter(([, value]) => value && value !== 1)), { replace: true });

    const openNotification = (notification) => {
        markRead(notification);
        navigate(notificationTarget(notification));
    };

    const readAll = async () => {
        try {
            await markAllRead();
            load();
        } catch (readError) {
            toast.error('تعذر تحديث الإشعارات', readError.message);
        }
    };

    return (
        <>
            <PageHeader
                title="الإشعارات"
                description="طلبات الانضمام الجديدة وطلبات تحويل العمولة من المسوقين"
                breadcrumbs={['لوحة التحكم', 'الإشعارات']}
                actions={
                    unreadCount > 0 && (
                        <Button variant="secondary" icon="check" onClick={readAll}>
                            تحديد الكل كمقروء
                        </Button>
                    )
                }
            />

            <section className="mk-card overflow-hidden">
                <Tabs
                    tabs={[
                        { value: '', label: 'كل الإشعارات' },
                        { value: 'unread', label: 'غير المقروءة', count: unreadCount },
                    ]}
                    value={filter}
                    onChange={(value) => setQuery({ filter: value, page: 1 })}
                    className="px-3"
                />

                <div className="p-3">
                    {error ? (
                        <EmptyState icon="alert-triangle" title="تعذر تحميل الإشعارات" description={error} action={<Button variant="secondary" icon="refresh" onClick={load}>إعادة المحاولة</Button>} />
                    ) : !result ? (
                        <div className="flex flex-col gap-2">
                            {[0, 1, 2].map((index) => (
                                <Skeleton key={index} className="h-16 w-full" />
                            ))}
                        </div>
                    ) : result.data.length === 0 ? (
                        <EmptyState icon="bell" title={filter ? 'لا توجد إشعارات غير مقروءة' : 'لا توجد إشعارات بعد'} description="ستصلك هنا طلبات الانضمام وطلبات تحويل العمولة من المسوقين." />
                    ) : (
                        <div className="flex flex-col gap-1">
                            {result.data.map((notification) => (
                                <NotificationItem key={notification.id} notification={notification} onOpen={openNotification} />
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
