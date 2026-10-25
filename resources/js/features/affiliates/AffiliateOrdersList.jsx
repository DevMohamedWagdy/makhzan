import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Display';
import { Skeleton } from '@/components/ui/Spinner';
import { OrderStatusBadge } from '@/features/orders/OrderBadges';
import { t } from '@/i18n';
import { formatDate, formatMoney } from '@/lib/format';
import { findGovernorate } from '@/lib/locations';

export const COMMISSION_STATUS_BADGES = {
    pending: { label: t('تُستحق عند التوصيل'), tone: 'warning' },
    earned: { label: t('مكتسبة'), tone: 'success' },
    cancelled: { label: t('أُلغيت'), tone: 'neutral' },
};

/** An order from an affiliate's links with its commission; clickable when `onOpen` is given. */
export function AffiliateOrderRow({ order, onOpen }) {
    const commission = COMMISSION_STATUS_BADGES[order.commission_status ?? order.commission?.status];
    const Row = onOpen ? 'button' : 'div';

    return (
        <li>
            <Row type={onOpen ? 'button' : undefined} onClick={onOpen ? () => onOpen(order) : undefined} className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 text-start transition hover:bg-surface-2">
                <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-ink">#{order.number}</span>
                        <OrderStatusBadge status={order.status} />
                    </span>
                    <span className="mt-1 block text-xs text-muted">
                        {formatDate(order.created_at)} · {findGovernorate(order.governorate_id ?? order.address?.governorate_id)?.name} · {t('{count} منتج', { count: order.items_count })}
                    </span>
                </span>
                <span className="text-end">
                    <span className="block text-xs text-muted">{t('قيمة الطلب {amount}', { amount: formatMoney(order.subtotal) })}</span>
                    <span className="block font-bold text-ink">{formatMoney(order.commission_amount ?? order.commission?.amount)}</span>
                    {commission && <Badge tone={commission.tone}>{commission.label}</Badge>}
                </span>
            </Row>
        </li>
    );
}

/**
 * Orders that came through an affiliate's links. `load(page)` returns a paginated
 * `{ data, meta }`; rows link to the order when `onOpen` is given (vendor view).
 */
export function AffiliateOrdersList({ load, refreshKey, onOpen, emptyText }) {
    const [items, setItems] = useState(null);
    const [meta, setMeta] = useState(null);
    const [error, setError] = useState(null);
    const [loadingMore, setLoadingMore] = useState(false);

    const fetchPage = useCallback(
        async (page) => {
            const response = await load(page);

            setItems((current) => (page === 1 ? response.data : [...(current ?? []), ...response.data]));
            setMeta(response.meta);
        },
        [load],
    );

    useEffect(() => {
        setError(null);
        fetchPage(1).catch((loadError) => setError(loadError.message));
    }, [fetchPage, refreshKey]);

    if (error) {
        return <p className="rounded-xl border border-dashed border-line-strong p-5 text-center text-sm text-danger">{error}</p>;
    }

    if (!items) {
        return (
            <div className="flex flex-col gap-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
            </div>
        );
    }

    if (items.length === 0) {
        return <p className="rounded-xl border border-dashed border-line-strong p-5 text-center text-sm text-muted">{emptyText ?? t('لا توجد طلبات من روابطك بعد.')}</p>;
    }

    return (
        <div className="flex flex-col gap-3">
            <ul className="mk-list">
                {items.map((order) => (
                    <AffiliateOrderRow key={order.order_id} order={order} onOpen={onOpen} />
                ))}
            </ul>
            {meta && meta.current_page < meta.last_page && (
                <Button
                    variant="secondary"
                    size="sm"
                    loading={loadingMore}
                    className="self-center"
                    onClick={async () => {
                        setLoadingMore(true);

                        try {
                            await fetchPage(meta.current_page + 1);
                        } finally {
                            setLoadingMore(false);
                        }
                    }}
                >
                    {t('عرض المزيد')}
                </Button>
            )}
        </div>
    );
}
