import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { EmptyState, StatCard } from '@/components/ui/Display';
import { Pagination, Tabs } from '@/components/ui/Navigation';
import { Skeleton } from '@/components/ui/Spinner';
import { useAffiliatePortal } from '@/features/affiliate-portal/AffiliatePortalLayout';
import { AffiliateOrderRow, COMMISSION_STATUS_BADGES } from '@/features/affiliates/AffiliateOrdersList';
import { t } from '@/i18n';
import { formatMoney, formatNumber } from '@/lib/format';
import { affiliatePortalApi } from '@/services/affiliatePortalApi';

/** Every order from the affiliate's links, paginated, filtered by commission status. */
export function AffiliateOrdersPage() {
    const { affiliate } = useAffiliatePortal();
    const [searchParams, setSearchParams] = useSearchParams();
    const status = searchParams.get('status') ?? '';
    const page = Number(searchParams.get('page')) || 1;
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        setError(null);
        affiliatePortalApi
            .orders(page, status || undefined)
            .then(setResult)
            .catch((loadError) => setError(loadError.message));
    }, [page, status, attempt, affiliate.stats.orders_count]);

    const setQuery = (patch) => setSearchParams(Object.fromEntries(Object.entries({ status, page, ...patch }).filter(([key, value]) => value && !(key === 'page' && value === 1))), { replace: true });

    return (
        <>
            <div>
                <h1 className="mk-page-title">{t('طلباتي')}</h1>
                <p className="mt-1 text-sm text-muted">{t('الطلبات التي تمت عبر روابطك وعمولة كل طلب')}</p>
            </div>

            <div className="mk-stat-group sm:grid-cols-3">
                <StatCard label={t('طلبات مسلّمة')} value={formatNumber(affiliate.stats.orders_count)} icon="check-circle" tone="success" />
                <StatCard label={t('عمولة متوقعة')} value={result?.summary ? formatMoney(result.summary.expected_commission) : '—'} icon="refresh" tone="warning" hint={result?.summary && t('من {count} طلب لم يُسلَّم بعد', { count: formatNumber(result.summary.expected_orders) })} />
                <StatCard label={t('إجمالي أرباحي')} value={formatMoney(affiliate.stats.earned_commission)} icon="wallet" tone="primary" />
            </div>

            <section className="mk-card overflow-hidden">
                <Tabs
                    tabs={[{ value: '', label: t('كل الطلبات') }, ...Object.entries(COMMISSION_STATUS_BADGES).map(([value, config]) => ({ value, label: config.label }))]}
                    value={status}
                    onChange={(value) => setQuery({ status: value, page: 1 })}
                    className="px-3"
                />
                <div className="p-4">
                    {error ? (
                        <EmptyState icon="alert-triangle" title={t('تعذر تحميل الطلبات')} description={error} action={<Button variant="secondary" icon="refresh" onClick={() => setAttempt((value) => value + 1)}>{t('إعادة المحاولة')}</Button>} />
                    ) : !result ? (
                        <div className="flex flex-col gap-3">
                            {[0, 1, 2].map((index) => (
                                <Skeleton key={index} className="h-16 w-full" />
                            ))}
                        </div>
                    ) : result.data.length === 0 ? (
                        <EmptyState icon="shopping-bag" title={status ? t('لا توجد طلبات بهذه الحالة') : t('لا توجد طلبات من روابطك بعد')} description={t('شارك روابط الإحالة الخاصة بك، وكل طلب يتم عبرها يظهر هنا.')} />
                    ) : (
                        <ul className="flex flex-col gap-3">
                            {result.data.map((order) => (
                                <AffiliateOrderRow key={order.order_id} order={order} />
                            ))}
                        </ul>
                    )}
                </div>
                {result && result.meta.last_page > 1 && (
                    <div className="border-t border-line px-4 py-3">
                        <Pagination meta={result.meta} onPageChange={(nextPage) => setQuery({ page: nextPage })} />
                    </div>
                )}
            </section>
        </>
    );
}
