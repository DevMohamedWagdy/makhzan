import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card, EmptyState, StatCard } from '@/components/ui/Display';
import { Pagination } from '@/components/ui/Navigation';
import { Skeleton } from '@/components/ui/Spinner';
import { useAffiliatePortal } from '@/features/affiliate-portal/AffiliatePortalLayout';
import { PayoutRequestCard } from '@/features/affiliate-portal/PortalWidgets';
import { PayoutItem } from '@/features/affiliates/PayoutHistory';
import { t } from '@/i18n';
import { formatMoney } from '@/lib/format';
import { affiliatePortalApi } from '@/services/affiliatePortalApi';

/** Balance, the transfer request button and every payout, paginated. */
export function AffiliatePayoutsPage() {
    const { affiliate, isImpersonating, openPayoutModal } = useAffiliatePortal();
    const [searchParams, setSearchParams] = useSearchParams();
    const page = Number(searchParams.get('page')) || 1;
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        setError(null);
        affiliatePortalApi
            .payouts(page)
            .then(setResult)
            .catch((loadError) => setError(loadError.message));
    }, [page, attempt, affiliate.stats.pending_balance, affiliate.payout_request?.payout_id]);

    return (
        <>
            <div>
                <h1 className="mk-page-title">{t('أرباحي وتحويلاتي')}</h1>
                <p className="mt-1 text-sm text-muted">{t('المبالغ التي حوّلها المتجر لك وطلبات التحويل')}</p>
            </div>

            <div className="mk-stat-group sm:grid-cols-3">
                <StatCard label={t('إجمالي أرباحي')} value={formatMoney(affiliate.stats.earned_commission)} icon="wallet" tone="success" />
                <StatCard label={t('إجمالي المحوَّل')} value={result ? formatMoney(result.summary.total_paid) : '—'} icon="send" tone="info" />
                <StatCard label={t('رصيد مستحق')} value={formatMoney(affiliate.stats.pending_balance)} icon="refresh" tone="warning" />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <Card title={t('سجل تحويلاتي')} className="lg:col-span-2" bodyClassName="p-0">
                    <div className="p-5">
                        {error ? (
                            <EmptyState icon="alert-triangle" title={t('تعذر تحميل التحويلات')} description={error} action={<Button variant="secondary" icon="refresh" onClick={() => setAttempt((value) => value + 1)}>{t('إعادة المحاولة')}</Button>} />
                        ) : !result ? (
                            <div className="flex flex-col gap-3">
                                <Skeleton className="h-20 w-full" />
                                <Skeleton className="h-20 w-full" />
                            </div>
                        ) : result.data.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-line-strong p-5 text-center text-sm text-muted">{t('لم تستلم أي تحويلات بعد.')}</p>
                        ) : (
                            <ul className="flex flex-col gap-3">
                                {result.data.map((payout) => (
                                    <PayoutItem key={payout.payout_id} payout={payout} />
                                ))}
                            </ul>
                        )}
                    </div>
                    {result && result.meta.last_page > 1 && (
                        <div className="border-t border-line px-4 py-3">
                            <Pagination meta={result.meta} onPageChange={(nextPage) => setSearchParams(nextPage > 1 ? { page: nextPage } : {}, { replace: true })} />
                        </div>
                    )}
                </Card>
                <div>
                    <PayoutRequestCard affiliate={affiliate} isImpersonating={isImpersonating} onRequest={openPayoutModal} />
                </div>
            </div>
        </>
    );
}
