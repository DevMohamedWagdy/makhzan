import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Display';
import { Skeleton } from '@/components/ui/Spinner';
import { OrderStatusBadge } from '@/features/orders/OrderBadges';
import { useCustomerAuth } from '@/features/storefront/CustomerAuthContext';
import { useStorefront } from '@/features/storefront/StorefrontLayout';
import { t } from '@/i18n';
import { formatDate, formatMoney } from '@/lib/format';

/** The shopper's orders in this store. */
export function StoreOrdersPage() {
    const { storeSlug } = useParams();
    const { store } = useStorefront();
    const { isAuthenticated, api } = useCustomerAuth();
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [loadingMore, setLoadingMore] = useState(false);

    useEffect(() => {
        if (store) {
            document.title = `${t('طلباتي')} | ${store.name}`;
        }
    }, [store]);

    useEffect(() => {
        if (!isAuthenticated) {
            return undefined;
        }

        let cancelled = false;

        api.orders()
            .then((response) => !cancelled && setResult(response))
            .catch((loadError) => !cancelled && setError(loadError.message));

        return () => {
            cancelled = true;
        };
    }, [isAuthenticated, api]);

    if (!isAuthenticated) {
        return <Navigate to={`/${storeSlug}/account/login?next=account/orders`} replace />;
    }

    const loadMore = async () => {
        setLoadingMore(true);

        try {
            const response = await api.orders(result.meta.current_page + 1);

            setResult((current) => ({ ...response, data: [...current.data, ...response.data] }));
        } finally {
            setLoadingMore(false);
        }
    };

    return (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
            <h1 className="text-2xl font-bold text-ink sm:text-3xl">{t('طلباتي')}</h1>

            {error ? (
                <EmptyState icon="alert-triangle" title={t('تعذر تحميل طلباتك')} description={error} />
            ) : !result ? (
                <div className="flex flex-col gap-3">
                    {[0, 1, 2].map((index) => (
                        <Skeleton key={index} className="h-24 w-full rounded-2xl" />
                    ))}
                </div>
            ) : result.data.length === 0 ? (
                <EmptyState
                    icon="shopping-bag"
                    title={t('لا توجد طلبات بعد')}
                    description={t('عندما تطلب من المتجر ستجد طلباتك وحالتها هنا.')}
                    action={
                        <Button to={`/${storeSlug}`} icon="store">
                            {t('ابدأ التسوق')}
                        </Button>
                    }
                />
            ) : (
                <ul className="flex flex-col gap-3">
                    {result.data.map((order) => (
                        <li key={order.order_id}>
                            <Link to={`/${storeSlug}/account/orders/${order.number}`} className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-4 transition hover:border-primary hover:shadow-md">
                                <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-ink">{t('طلب #{number}', { number: order.number })}</p>
                                    <p className="mt-1 text-sm text-muted">
                                        {formatDate(order.created_at)} · {t('{count} منتج', { count: order.items_count })}
                                    </p>
                                </div>
                                <OrderStatusBadge status={order.status} />
                                <span className="font-bold text-ink">{formatMoney(order.total)}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}

            {result && result.meta.current_page < result.meta.last_page && (
                <Button variant="secondary" loading={loadingMore} onClick={loadMore} className="self-center">
                    {t('عرض المزيد')}
                </Button>
            )}
        </div>
    );
}
