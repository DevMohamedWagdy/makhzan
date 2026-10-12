import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { EmptyState, StatCard } from '@/components/ui/Display';
import { Input } from '@/components/ui/Form';
import { Pagination, Tabs } from '@/components/ui/Navigation';
import { Skeleton } from '@/components/ui/Spinner';
import { OrderDrawer } from '@/features/orders/OrderDrawer';
import { OrderStatusBadge } from '@/features/orders/OrderBadges';
import { useDebouncedValue } from '@/hooks/common';
import { t } from '@/i18n';
import { ORDER_STATUSES } from '@/lib/constants';
import { cn, formatMoney, formatNumber, formatRelative } from '@/lib/format';
import { findGovernorate } from '@/lib/locations';
import { ordersApi } from '@/services/ordersApi';

const COLUMNS = [t('الطلب'), t('العميل'), t('المحافظة'), t('المنتجات'), t('الإجمالي'), t('المسوق'), t('الحالة')];

/** All store orders with status tabs, search, and the order drawer (?order={id}). */
export function OrdersPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const status = searchParams.get('status') ?? '';
    const page = Number(searchParams.get('page')) || 1;
    const openOrderId = searchParams.get('order');
    const searchQuery = searchParams.get('search') ?? '';
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') ?? '');
    const search = useDebouncedValue(searchTerm, 300);
    const [result, setResult] = useState(null);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const setQuery = useCallback(
        (patch) =>
            setSearchParams(
                (previous) => {
                    const next = new URLSearchParams(previous);

                    Object.entries({ ...patch, ...(!('page' in patch) && !('order' in patch) && { page: 1 }) }).forEach(([key, value]) => (value === '' || value == null || (key === 'page' && value === 1) ? next.delete(key) : next.set(key, value)));

                    return next;
                },
                { replace: true },
            ),
        [setSearchParams],
    );

    useEffect(() => {
        if (search !== searchQuery) {
            setQuery({ search });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const [list, counts] = await Promise.all([ordersApi.list({ status, search: searchQuery, page }), ordersApi.summary()]);

            setResult(list);
            setSummary(counts);
        } catch (loadError) {
            setError(loadError.message);
        } finally {
            setLoading(false);
        }
    }, [status, page, searchQuery]);

    useEffect(() => {
        load();
    }, [load]);

    const closeOrder = useCallback(() => setQuery({ order: '' }), [setQuery]);

    const tabs = useMemo(
        () => [
            { value: '', label: t('كل الطلبات'), count: summary?.total },
            ...Object.entries(ORDER_STATUSES).map(([value, config]) => ({ value, label: config.label, count: summary?.[value] })),
        ],
        [summary],
    );

    const items = result?.data ?? [];

    return (
        <>
            <PageHeader title={t('الطلبات')} description={t('تابع طلبات متجرك وغيّر حالتها حتى التوصيل')} breadcrumbs={[t('لوحة التحكم'), t('التجارة'), t('الطلبات')]} />

            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label={t('بانتظار التأكيد')} value={summary ? formatNumber(summary.pending) : '—'} icon="refresh" tone="warning" />
                <StatCard label={t('طلبات اليوم')} value={summary ? formatNumber(summary.today) : '—'} icon="shopping-bag" tone="primary" />
                <StatCard label={t('قيد الشحن')} value={summary ? formatNumber(summary.shipped) : '—'} icon="truck" tone="info" />
                <StatCard label={t('إيرادات الطلبات المسلّمة')} value={summary ? formatMoney(summary.delivered_revenue) : '—'} icon="wallet" tone="success" hint={summary && t('{count} طلب تم توصيله', { count: formatNumber(summary.delivered) })} />
            </div>

            <section className="mk-card overflow-hidden">
                <Tabs tabs={tabs} value={status} onChange={(value) => setQuery({ status: value })} className="px-3" />
                <div className="p-4">
                    <Input type="search" icon="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder={t('ابحث برقم الطلب أو اسم العميل أو هاتفه...')} aria-label={t('بحث في الطلبات')} className="lg:w-96" />
                </div>

                {error ? (
                    <div className="p-6">
                        <EmptyState icon="alert-triangle" title={t('تعذر تحميل الطلبات')} description={error} action={<Button variant="secondary" icon="refresh" onClick={load}>{t('إعادة المحاولة')}</Button>} />
                    </div>
                ) : !loading && items.length === 0 ? (
                    <div className="p-6">
                        <EmptyState icon="shopping-bag" title={status || searchTerm ? t('لا توجد طلبات مطابقة') : t('لا توجد طلبات بعد')} description={t('عندما يطلب العملاء من متجرك ستظهر طلباتهم هنا ويصلك إشعار بكل طلب.')} />
                    </div>
                ) : (
                    <div className="mk-scroll overflow-x-auto">
                        <table className="w-full min-w-[820px] text-sm">
                            <thead className="border-y border-line bg-surface-2 text-xs text-muted">
                                <tr>
                                    {COLUMNS.map((column) => (
                                        <th key={column} scope="col" className="px-4 py-3 text-start font-medium whitespace-nowrap">
                                            {column}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className={cn('divide-y divide-line transition-opacity', loading && items.length > 0 && 'opacity-60')}>
                                {loading && items.length === 0
                                    ? Array.from({ length: 5 }, (_, index) => (
                                          <tr key={index}>
                                              {COLUMNS.map((column) => (
                                                  <td key={column} className="px-4 py-4">
                                                      <Skeleton className="h-4 w-20" />
                                                  </td>
                                              ))}
                                          </tr>
                                      ))
                                    : items.map((order) => (
                                          <tr key={order.order_id} className="cursor-pointer transition hover:bg-surface-2" onClick={() => setQuery({ order: order.order_id })}>
                                              <td className="px-4 py-3.5 whitespace-nowrap">
                                                  <span className="block font-semibold text-ink">#{order.number}</span>
                                                  <span className="text-xs text-muted">{formatRelative(order.created_at)}</span>
                                              </td>
                                              <td className="px-4 py-3.5">
                                                  <span className="block font-medium text-ink">{order.address.recipient_name}</span>
                                                  <span className="ltr block text-start text-xs text-muted">{order.address.phone}</span>
                                              </td>
                                              <td className="px-4 py-3.5 whitespace-nowrap text-ink-2">{findGovernorate(order.address.governorate_id)?.name}</td>
                                              <td className="px-4 py-3.5 text-ink-2">{t('{count} منتج', { count: order.items_count })}</td>
                                              <td className="px-4 py-3.5 font-semibold whitespace-nowrap text-ink">{formatMoney(order.total)}</td>
                                              <td className="px-4 py-3.5 text-ink-2">{order.affiliate?.full_name ?? '—'}</td>
                                              <td className="px-4 py-3.5">
                                                  <OrderStatusBadge status={order.status} />
                                              </td>
                                          </tr>
                                      ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {result && result.meta.total > result.meta.per_page && (
                    <div className="border-t border-line px-4 py-3">
                        <Pagination meta={result.meta} onPageChange={(nextPage) => setQuery({ page: nextPage })} />
                    </div>
                )}
            </section>

            <OrderDrawer orderId={openOrderId} onClose={closeOrder} onChanged={load} />
        </>
    );
}
