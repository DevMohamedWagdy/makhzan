import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Display';
import { Pagination } from '@/components/ui/Navigation';
import { Skeleton } from '@/components/ui/Spinner';
import { NotificationItem, adminNotificationTarget } from '@/features/notifications/NotificationItem';
import { t } from '@/i18n';
import { adminApi } from '@/services/adminApi';

/** All admin alerts: new stores, subscription requests, ended trials. */
export function AdminNotificationsPage() {
    const navigate = useNavigate();
    const { reloadNotifications } = useOutletContext() ?? {};
    const [page, setPage] = useState(1);
    const [result, setResult] = useState(null);

    const load = useCallback(() => {
        adminApi.notifications({ page, per_page: 20 }).then(setResult).catch(() => setResult({ data: [], meta: null, summary: { unread_count: 0 } }));
    }, [page]);

    useEffect(load, [load]);

    const open = async (notification) => {
        if (!notification.read_at) {
            await adminApi.markNotificationRead(notification.id).catch(() => {});
            reloadNotifications?.();
        }

        navigate(adminNotificationTarget(notification));
    };

    const markAll = async () => {
        await adminApi.markAllNotificationsRead().catch(() => {});
        reloadNotifications?.();
        load();
    };

    return (
        <>
            <PageHeader
                title={t('الإشعارات')}
                description={t('تجار جدد وطلبات اشتراك وفترات تجريبية انتهت')}
                actions={
                    result?.summary?.unread_count > 0 && (
                        <Button variant="secondary" icon="check" onClick={markAll}>
                            {t('تحديد الكل كمقروء')}
                        </Button>
                    )
                }
            />
            <section className="mk-card overflow-hidden">
                {!result ? (
                    <div className="flex flex-col gap-2 p-4">
                        {[0, 1, 2].map((index) => (
                            <Skeleton key={index} className="h-14 w-full" />
                        ))}
                    </div>
                ) : result.data.length === 0 ? (
                    <div className="p-6">
                        <EmptyState icon="bell" title={t('لا توجد إشعارات')} />
                    </div>
                ) : (
                    <div className="flex flex-col p-2">
                        {result.data.map((notification) => (
                            <NotificationItem key={notification.id} notification={notification} onOpen={open} />
                        ))}
                    </div>
                )}
                {result?.meta && result.meta.total > result.meta.per_page && (
                    <div className="border-t border-line px-4 py-3">
                        <Pagination meta={result.meta} onPageChange={setPage} />
                    </div>
                )}
            </section>
        </>
    );
}
