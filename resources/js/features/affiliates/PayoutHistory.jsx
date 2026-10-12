import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Display';
import { Skeleton } from '@/components/ui/Spinner';
import { PAYOUT_METHODS, PAYOUT_STATUSES } from '@/lib/constants';
import { formatDate, formatMoney } from '@/lib/format';

export function PayoutStatusBadge({ status }) {
    const config = PAYOUT_STATUSES[status];

    return (
        <Badge tone={config.tone} icon={config.icon}>
            {config.label}
        </Badge>
    );
}

/**
 * Payouts and transfer requests, newest first, shared by the vendor's affiliate profile
 * and the affiliate's own dashboard. `load(page)` returns a paginated `{ data, meta, summary }`;
 * changing `refreshKey` reloads from the first page.
 */
export function PayoutHistory({ load, refreshKey, emptyText = 'لا توجد تحويلات بعد.' }) {
    const [items, setItems] = useState(null);
    const [meta, setMeta] = useState(null);
    const [totalPaid, setTotalPaid] = useState(0);
    const [error, setError] = useState(null);
    const [loadingMore, setLoadingMore] = useState(false);

    const fetchPage = useCallback(
        async (page) => {
            const response = await load(page);

            setItems((current) => (page === 1 ? response.data : [...(current ?? []), ...response.data]));
            setMeta(response.meta);
            setTotalPaid(response.summary?.total_paid ?? 0);
        },
        [load],
    );

    useEffect(() => {
        setError(null);
        fetchPage(1).catch((loadError) => setError(loadError.message));
    }, [fetchPage, refreshKey]);

    const loadMore = async () => {
        setLoadingMore(true);

        try {
            await fetchPage(meta.current_page + 1);
        } catch (loadError) {
            setError(loadError.message);
        } finally {
            setLoadingMore(false);
        }
    };

    if (error) {
        return <p className="rounded-xl border border-dashed border-line-strong p-5 text-center text-sm text-danger">{error}</p>;
    }

    if (items === null) {
        return (
            <div className="flex flex-col gap-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
            </div>
        );
    }

    if (items.length === 0) {
        return <p className="rounded-xl border border-dashed border-line-strong p-5 text-center text-sm text-muted">{emptyText}</p>;
    }

    return (
        <div className="flex flex-col gap-3">
            <p className="text-xs text-muted">
                إجمالي المحوَّل: <strong className="text-ink">{formatMoney(totalPaid)}</strong>
            </p>
            <ul className="flex flex-col gap-3">
                {items.map((payout) => (
                    <li key={payout.payout_id} className="rounded-xl border border-line p-4">
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-base font-bold text-ink">{formatMoney(payout.amount)}</span>
                            <PayoutStatusBadge status={payout.status} />
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                            <span>
                                {PAYOUT_METHODS[payout.payout_method.type]?.label} <span className="ltr inline-block font-mono">•••• {payout.payout_method.account_number_last4}</span>
                            </span>
                            {payout.status === 'paid' && <span>حُوِّل في {formatDate(payout.paid_at)}</span>}
                            {payout.status === 'requested' && <span>طُلب في {formatDate(payout.created_at)}</span>}
                            {payout.status === 'rejected' && <span>رُفض في {formatDate(payout.rejected_at)}</span>}
                            {payout.reference && (
                                <span>
                                    رقم العملية: <span className="ltr inline-block font-mono text-ink-2">{payout.reference}</span>
                                </span>
                            )}
                        </div>
                        {payout.request_note && <p className="mt-2 text-xs text-ink-2">ملاحظة المسوق: {payout.request_note}</p>}
                        {payout.note && <p className="mt-1 text-xs text-ink-2">ملاحظة المتجر: {payout.note}</p>}
                    </li>
                ))}
            </ul>
            {meta && meta.current_page < meta.last_page && (
                <Button variant="secondary" size="sm" loading={loadingMore} onClick={loadMore} className="self-center">
                    عرض المزيد
                </Button>
            )}
        </div>
    );
}
