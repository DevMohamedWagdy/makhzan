import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { EmptyState, StatCard } from '@/components/ui/Display';
import { Input, Select } from '@/components/ui/Form';
import { Pagination, Tabs } from '@/components/ui/Navigation';
import { Skeleton } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { OrderDrawer } from '@/features/orders/OrderDrawer';
import { OrderSourceBadge, OrderStatusBadge, PaymentBadge } from '@/features/orders/OrderBadges';
import { useDebouncedValue } from '@/hooks/common';
import { t } from '@/i18n';
import { ORDER_SOURCES, ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES } from '@/lib/constants';
import { cn, formatMoney, formatNumber, formatRelative } from '@/lib/format';
import { findGovernorate } from '@/lib/locations';
import { openOrderPrint } from '@/pages/orders/OrderPrintPage';
import { ordersApi } from '@/services/ordersApi';

const COLUMNS = [t('الطلب'), t('العميل'), t('المحافظة'), t('المنتجات'), t('الإجمالي'), t('المسوق'), t('الدفع'), t('الحالة')];

/** The payment filter (?payment=…): cash on delivery, or an online payment status. */
const PAYMENT_FILTERS = [
    { value: 'cod', label: PAYMENT_METHODS.cod.label, query: { payment_method: 'cod' } },
    ...Object.entries(PAYMENT_STATUSES).map(([value, config]) => ({ value, label: t('أونلاين: {status}', { status: config.label }), query: { payment_status: value } })),
];

/**
 * All store orders with status tabs, search, payment filter, the order drawer (?order={id}),
 * and printing invoices or packing slips for the selected orders.
 */
export function OrdersPage() {
    const { can } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const status = searchParams.get('status') ?? '';
    const page = Number(searchParams.get('page')) || 1;
    const openOrderId = searchParams.get('order');
    const searchQuery = searchParams.get('search') ?? '';
    const affiliateId = searchParams.get('affiliate_id') ?? '';
    const couponId = searchParams.get('coupon_id') ?? '';
    const payment = searchParams.get('payment') ?? '';
    const source = searchParams.get('source') ?? '';
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
            const [list, counts] = await Promise.all([ordersApi.list({ status, source, search: searchQuery, affiliate_id: affiliateId, coupon_id: couponId, ...PAYMENT_FILTERS.find((filter) => filter.value === payment)?.query, page }), ordersApi.summary()]);

            setResult(list);
            setSummary(counts);
        } catch (loadError) {
            setError(loadError.message);
        } finally {
            setLoading(false);
        }
    }, [status, source, page, searchQuery, affiliateId, couponId, payment]);

    useEffect(() => {
        load();
    }, [load]);

    const closeOrder = useCallback(() => setQuery({ order: '' }), [setQuery]);

    const [selectedIds, setSelectedIds] = useState([]);

    // Selection belongs to the rows on screen; a new page, tab or search starts over.
    useEffect(() => setSelectedIds([]), [result]);

    const toggleSelected = (orderId) => setSelectedIds((current) => (current.includes(orderId) ? current.filter((id) => id !== orderId) : [...current, orderId]));

    const tabs = useMemo(
        () => [
            { value: '', label: t('كل الطلبات'), count: summary?.total },
            ...Object.entries(ORDER_STATUSES).map(([value, config]) => ({ value, label: config.label, count: summary?.[value] })),
        ],
        [summary],
    );

    const items = result?.data ?? [];
    const allSelected = items.length > 0 && selectedIds.length === items.length;

    return (
        <>
            <PageHeader title={t('الطلبات')} description={t('تابع طلبات متجرك وغيّر حالتها حتى التوصيل')} breadcrumbs={[t('لوحة التحكم'), t('المبيعات'), t('الطلبات')]}
                actions={
                    can('orders.create') && (
                        <Button to="/dashboard/orders/new" icon="plus">
                            {t('طلب يدوي')}
                        </Button>
                    )
                }
            />

            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label={t('بانتظار التأكيد')} value={summary ? formatNumber(summary.pending) : '—'} icon="refresh" tone="warning" />
                <StatCard label={t('طلبات اليوم')} value={summary ? formatNumber(summary.today) : '—'} icon="shopping-bag" tone="primary" />
                <StatCard label={t('قيد الشحن')} value={summary ? formatNumber(summary.shipped) : '—'} icon="truck" tone="info" />
                <StatCard label={t('إيرادات الطلبات المسلّمة')} value={summary ? formatMoney(summary.delivered_revenue) : '—'} icon="wallet" tone="success" hint={summary && t('{count} طلب تم توصيله', { count: formatNumber(summary.delivered) })} />
            </div>

            <section className="mk-card overflow-hidden">
                <Tabs tabs={tabs} value={status} onChange={(value) => setQuery({ status: value })} className="px-3" />
                <div className="flex flex-wrap items-center gap-3 p-4">
                    <Input type="search" icon="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder={t('ابحث برقم الطلب أو اسم العميل أو هاتفه...')} aria-label={t('بحث في الطلبات')} className="lg:w-96" />
                    <Select value={payment} onChange={(event) => setQuery({ payment: event.target.value })} icon="credit-card" aria-label={t('الدفع')} className="sm:w-56" options={[{ value: '', label: t('كل طرق الدفع') }, ...PAYMENT_FILTERS]} />
                    <Select value={source} onChange={(event) => setQuery({ source: event.target.value })} icon="filter" aria-label={t('مصدر الطلب')} className="sm:w-48" options={[{ value: '', label: t('كل المصادر') }, ...Object.entries(ORDER_SOURCES).map(([value, config]) => ({ value, label: config.label }))]} />
                    {couponId && (
                        <Button variant="soft" size="sm" iconEnd="x" onClick={() => setQuery({ coupon_id: '' })}>
                            {t('طلبات الكوبون: {code}', { code: items[0]?.coupon_code ?? `#${couponId}` })}
                        </Button>
                    )}
                    {selectedIds.length > 0 && (
                        <span className="ms-auto flex flex-wrap items-center gap-2">
                            <span className="text-sm text-muted">{t('تم اختيار {count}', { count: selectedIds.length })}</span>
                            <Button size="sm" variant="secondary" icon="file-text" onClick={() => openOrderPrint(selectedIds, 'invoice')}>
                                {t('طباعة الفواتير')}
                            </Button>
                            <Button size="sm" variant="secondary" icon="box" onClick={() => openOrderPrint(selectedIds, 'packing')}>
                                {t('طباعة بوالص التغليف')}
                            </Button>
                        </span>
                    )}
                    {affiliateId && (
                        <Button variant="soft" size="sm" iconEnd="x" onClick={() => setQuery({ affiliate_id: '' })}>
                            {t('طلبات المسوق: {name}', { name: items[0]?.affiliate?.full_name ?? `#${affiliateId}` })}
                        </Button>
                    )}
                </div>

                {error ? (
                    <div className="p-6">
                        <EmptyState icon="alert-triangle" title={t('تعذر تحميل الطلبات')} description={error} action={<Button variant="secondary" icon="refresh" onClick={load}>{t('إعادة المحاولة')}</Button>} />
                    </div>
                ) : !loading && items.length === 0 ? (
                    <div className="p-6">
                        <EmptyState icon="shopping-bag" title={status || searchTerm || payment || source ? t('لا توجد طلبات مطابقة') : t('لا توجد طلبات بعد')} description={t('عندما يطلب العملاء من متجرك ستظهر طلباتهم هنا ويصلك إشعار بكل طلب.')}
                            action={
                                can('orders.create') && (
                                    <Button variant="secondary" icon="plus" to="/dashboard/orders/new">
                                        {t('سجّل طلباً وصلك على واتساب')}
                                    </Button>
                                )
                            }
                        />
                    </div>
                ) : (
                    <div className="mk-scroll overflow-x-auto">
                        <table className="w-full min-w-[940px] text-sm">
                            <thead className="border-y border-line bg-surface-2 text-xs text-muted">
                                <tr>
                                    <th scope="col" className="w-10 ps-4 py-3">
                                        <input type="checkbox" className="size-4 accent-primary" checked={allSelected} onChange={() => setSelectedIds(allSelected ? [] : items.map((order) => order.order_id))} aria-label={t('اختيار كل الطلبات')} />
                                    </th>
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
                                              <td className="ps-4" />
                                              {COLUMNS.map((column) => (
                                                  <td key={column} className="px-4 py-4">
                                                      <Skeleton className="h-4 w-20" />
                                                  </td>
                                              ))}
                                          </tr>
                                      ))
                                    : items.map((order) => (
                                          <tr key={order.order_id} className="cursor-pointer transition hover:bg-surface-2" onClick={() => setQuery({ order: order.order_id })}>
                                              <td className="ps-4 py-3.5" onClick={(event) => event.stopPropagation()}>
                                                  <input type="checkbox" className="size-4 accent-primary" checked={selectedIds.includes(order.order_id)} onChange={() => toggleSelected(order.order_id)} aria-label={t('اختيار الطلب #{number}', { number: order.number })} />
                                              </td>
                                              <td className="px-4 py-3.5 whitespace-nowrap">
                                                  <span className="block font-semibold text-ink">#{order.number}</span>
                                                  <span className="text-xs text-muted">{formatRelative(order.created_at)}</span>
                                                  {order.source !== 'store' && (
                                                      <span className="mt-1 block">
                                                          <OrderSourceBadge source={order.source} />
                                                      </span>
                                                  )}
                                              </td>
                                              <td className="px-4 py-3.5">
                                                  <span className="block font-medium text-ink">{order.address.recipient_name}</span>
                                                  <span className="ltr block text-start text-xs text-muted">{order.address.phone}</span>
                                              </td>
                                              <td className="px-4 py-3.5 whitespace-nowrap text-ink-2">{findGovernorate(order.address.governorate_id)?.name}</td>
                                              <td className="px-4 py-3.5 text-ink-2">{t('{count} منتج', { count: order.items_count })}</td>
                                              <td className="px-4 py-3.5 whitespace-nowrap">
                                                  <span className="block font-semibold text-ink">{formatMoney(order.total)}</span>
                                                  {order.coupon_code && <span className="ltr block text-start font-mono text-[11px] text-success">{order.coupon_code}</span>}
                                              </td>
                                              <td className="px-4 py-3.5 text-ink-2">{order.affiliate?.full_name ?? '—'}</td>
                                              <td className="px-4 py-3.5">
                                                  <PaymentBadge order={order} />
                                              </td>
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
