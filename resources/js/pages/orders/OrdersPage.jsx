import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { EmptyState, SelectionBar, StatCard, StatStrip } from '@/components/ui/Display';
import { Input, Select } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
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

const COLUMNS = [t('الطلب'), t('العميل'), t('الإجمالي'), t('الدفع'), t('المسوق'), t('الحالة')];

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
    const hasFilters = Boolean(searchTerm || payment || source || couponId || affiliateId);
    const clearFilters = () => {
        setSearchTerm('');
        setQuery({ search: '', payment: '', source: '', coupon_id: '', affiliate_id: '' });
    };
    const allSelected = items.length > 0 && selectedIds.length === items.length;

    return (
        <>
            <PageHeader title={t('الطلبات')} icon="shopping-bag" description={t('تابع طلبات متجرك وغيّر حالتها حتى التوصيل')} breadcrumbs={[t('لوحة التحكم'), t('المبيعات'), t('الطلبات')]}
                actions={
                    can('orders.create') && (
                        <Button to="/dashboard/orders/new" icon="plus">
                            {t('طلب يدوي')}
                        </Button>
                    )
                }
            />

            <StatStrip>
                <StatCard label={t('طلبات اليوم')} value={summary ? formatNumber(summary.today) : '—'} icon="shopping-bag" tone="primary" />
                <StatCard label={t('بانتظار التأكيد')} value={summary ? formatNumber(summary.pending) : '—'} icon="refresh" tone="warning" onClick={() => setQuery({ status: status === 'pending' ? '' : 'pending' })} isActive={status === 'pending'} />
                <StatCard label={t('قيد الشحن')} value={summary ? formatNumber(summary.shipped) : '—'} icon="truck" tone="info" onClick={() => setQuery({ status: status === 'shipped' ? '' : 'shipped' })} isActive={status === 'shipped'} />
                <StatCard label={t('إيرادات الطلبات المسلّمة')} value={summary ? formatMoney(summary.delivered_revenue) : '—'} icon="wallet" tone="success" hint={summary && t('{count} طلب تم توصيله', { count: formatNumber(summary.delivered) })} onClick={() => setQuery({ status: status === 'delivered' ? '' : 'delivered' })} isActive={status === 'delivered'} />
            </StatStrip>

            <section className="mk-card overflow-hidden">
                <Tabs tabs={tabs} value={status} onChange={(value) => setQuery({ status: value })} className="px-3" />
                <div className="mk-toolbar">
                    <Input type="search" icon="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder={t('ابحث برقم الطلب أو اسم العميل أو هاتفه...')} aria-label={t('بحث في الطلبات')} className="lg:w-96" />
                    <Select value={payment} onChange={(event) => setQuery({ payment: event.target.value })} icon="credit-card" aria-label={t('الدفع')} className="sm:w-56" options={[{ value: '', label: t('كل طرق الدفع') }, ...PAYMENT_FILTERS]} />
                    <Select value={source} onChange={(event) => setQuery({ source: event.target.value })} icon="filter" aria-label={t('مصدر الطلب')} className="sm:w-48" options={[{ value: '', label: t('كل المصادر') }, ...Object.entries(ORDER_SOURCES).map(([value, config]) => ({ value, label: config.label }))]} />
                    {couponId && (
                        <Button variant="soft" size="sm" iconEnd="x" onClick={() => setQuery({ coupon_id: '' })}>
                            {t('طلبات الكوبون: {code}', { code: items[0]?.coupon_code ?? `#${couponId}` })}
                        </Button>
                    )}
                    {affiliateId && (
                        <Button variant="soft" size="sm" iconEnd="x" onClick={() => setQuery({ affiliate_id: '' })}>
                            {t('طلبات المسوق: {name}', { name: items[0]?.affiliate?.full_name ?? `#${affiliateId}` })}
                        </Button>
                    )}
                    {hasFilters && (
                        <Button variant="ghost" icon="x" onClick={clearFilters}>
                            {t('مسح الفلاتر')}
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
                        <table className="w-full min-w-[820px] text-sm">
                            <thead className="mk-thead">
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
                                          <tr key={order.order_id} className={cn('group cursor-pointer transition hover:bg-surface-2', selectedIds.includes(order.order_id) && 'bg-primary-soft/60 hover:bg-primary-soft')} onClick={() => setQuery({ order: order.order_id })}>
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
                                                  <span className="block font-medium whitespace-nowrap text-ink">{order.address.recipient_name}</span>
                                                  <span className="flex items-center gap-1.5 text-xs whitespace-nowrap text-muted">
                                                      <span className="ltr">{order.address.phone}</span>
                                                      <span aria-hidden="true">·</span>
                                                      <Icon name="map-pin" className="size-3" />
                                                      {findGovernorate(order.address.governorate_id)?.name}
                                                  </span>
                                              </td>
                                              <td className="px-4 py-3.5 whitespace-nowrap">
                                                  <span className="mk-num block font-semibold text-ink">{formatMoney(order.total)}</span>
                                                  <span className="text-xs text-muted">
                                                      {t('{count} منتج', { count: order.items_count })}
                                                      {order.coupon_code && <span className="ltr ms-1.5 font-mono text-2xs text-success">{order.coupon_code}</span>}
                                                  </span>
                                              </td>
                                              <td className="px-4 py-3.5">
                                                  <PaymentBadge order={order} />
                                              </td>
                                              <td className="px-4 py-3.5 text-ink-2">{order.affiliate?.full_name ?? <span className="text-muted">—</span>}</td>
                                              <td className="px-4 py-3.5">
                                                  <span className="flex items-center justify-between gap-2">
                                                      <OrderStatusBadge status={order.status} />
                                                      <Icon name="chevron-left" className="size-4 text-muted opacity-0 transition group-hover:opacity-100" />
                                                  </span>
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

            <SelectionBar count={selectedIds.length} onClear={() => setSelectedIds([])}>
                <Button size="sm" variant="brand" icon="file-text" onClick={() => openOrderPrint(selectedIds, 'invoice')}>
                    {t('طباعة الفواتير')}
                </Button>
                <Button size="sm" variant="outline-light" icon="box" onClick={() => openOrderPrint(selectedIds, 'packing')}>
                    {t('طباعة بوالص التغليف')}
                </Button>
            </SelectionBar>

            <OrderDrawer orderId={openOrderId} onClose={closeOrder} onChanged={load} />
        </>
    );
}
