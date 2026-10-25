import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { EmptyState, StatCard } from '@/components/ui/Display';
import { Input, Select } from '@/components/ui/Form';
import { Pagination, Tabs } from '@/components/ui/Navigation';
import { Skeleton } from '@/components/ui/Spinner';
import { PurchaseOrderStatusBadge } from '@/features/purchasing/PurchaseOrderBadges';
import { useDebouncedValue } from '@/hooks/common';
import { useAuth } from '@/context/AuthContext';
import { t } from '@/i18n';
import { PURCHASE_ORDER_STATUSES } from '@/lib/constants';
import { cn, formatDate, formatMoney, formatNumber } from '@/lib/format';
import { purchaseOrdersApi, suppliersApi } from '@/services/purchasingApi';

const COLUMNS = [t('الأمر'), t('المورد'), t('القطع'), t('الإجمالي'), t('الوصول المتوقع'), t('الحالة')];

/** Purchase orders with status tabs, supplier filter and search by number or supplier. */
export function PurchaseOrdersPage() {
    const { can } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const status = searchParams.get('status') ?? '';
    const supplierId = searchParams.get('supplier_id') ?? '';
    const page = Number(searchParams.get('page')) || 1;
    const searchQuery = searchParams.get('search') ?? '';
    const [searchTerm, setSearchTerm] = useState(searchQuery);
    const search = useDebouncedValue(searchTerm, 300);
    const [suppliers, setSuppliers] = useState([]);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const setQuery = useCallback(
        (patch) =>
            setSearchParams(
                (previous) => {
                    const next = new URLSearchParams(previous);

                    Object.entries({ ...patch, ...(!('page' in patch) && { page: 1 }) }).forEach(([key, value]) => (value === '' || value == null || (key === 'page' && value === 1) ? next.delete(key) : next.set(key, value)));

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

    useEffect(() => {
        suppliersApi
            .list()
            .then((response) => setSuppliers(response.data ?? response))
            .catch(() => {});
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            setResult(await purchaseOrdersApi.list({ status, supplier_id: supplierId, search: searchQuery, page }));
        } catch (loadError) {
            setError(loadError.message);
        } finally {
            setLoading(false);
        }
    }, [status, supplierId, searchQuery, page]);

    useEffect(() => {
        load();
    }, [load]);

    const summary = result?.summary;
    const tabs = useMemo(
        () => [{ value: '', label: t('كل الأوامر'), count: summary?.total }, ...Object.entries(PURCHASE_ORDER_STATUSES).map(([value, config]) => ({ value, label: config.label, count: summary?.[value] }))],
        [summary],
    );
    const orders = result?.data ?? [];

    return (
        <>
            <PageHeader
                title={t('أوامر الشراء')}
                description={t('اطلب البضاعة من موردينك، واستلمها كاملة أو على دفعات لتُضاف للمخزون')}
                breadcrumbs={[t('لوحة التحكم'), t('المخزون والمشتريات'), t('أوامر الشراء')]}
                actions={
                    <>
                        <Button variant="secondary" icon="building" to="/dashboard/suppliers">
                            {t('الموردين')}
                        </Button>
                        {can('purchasing.create') && (
                            <Button icon="plus" to={`/dashboard/purchase-orders/new${supplierId ? `?supplier_id=${supplierId}` : ''}`}>
                                {t('أمر شراء جديد')}
                            </Button>
                        )}
                    </>
                }
            />

            <div className="mb-6 mk-stat-group sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label={t('بانتظار الاستلام')} value={summary ? formatNumber(summary.ordered + summary.partial) : '—'} icon="send" tone="info" hint={summary?.partial ? t('منها {count} مستلم جزئياً', { count: formatNumber(summary.partial) }) : undefined} />
                <StatCard label={t('قطع في الطريق')} value={summary ? formatNumber(summary.units_on_order) : '—'} icon="truck" tone="warning" />
                <StatCard label={t('قيمة البضاعة في الطريق')} value={summary ? formatMoney(summary.value_on_order) : '—'} icon="wallet" tone="primary" />
                <StatCard label={t('مسودات')} value={summary ? formatNumber(summary.draft) : '—'} icon="edit" tone="neutral" />
            </div>

            <section className="mk-card overflow-hidden">
                <Tabs tabs={tabs} value={status} onChange={(value) => setQuery({ status: value })} className="px-3" />
                <div className="flex flex-wrap items-center gap-3 p-4">
                    <Input type="search" icon="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder={t('ابحث برقم الأمر أو اسم المورد...')} aria-label={t('بحث في أوامر الشراء')} className="lg:w-80" />
                    <Select aria-label={t('فلترة حسب المورد')} value={supplierId} onChange={(event) => setQuery({ supplier_id: event.target.value })} placeholder={t('كل الموردين')} options={suppliers.map((supplier) => ({ value: String(supplier.supplier_id), label: supplier.name }))} className="w-52" />
                </div>

                {error ? (
                    <div className="p-6">
                        <EmptyState icon="alert-triangle" title={t('تعذر تحميل أوامر الشراء')} description={error} action={<Button variant="secondary" icon="refresh" onClick={load}>{t('إعادة المحاولة')}</Button>} />
                    </div>
                ) : !loading && orders.length === 0 ? (
                    <div className="p-6">
                        <EmptyState
                            icon="download"
                            title={status || searchQuery || supplierId ? t('لا توجد أوامر مطابقة') : t('لا توجد أوامر شراء بعد')}
                            description={t('سجّل ما تطلبه من موردينك، وعند وصول البضاعة استلمها لتُضاف للمخزون بتكلفتها.')}
                            action={can('purchasing.create') && <Button icon="plus" to="/dashboard/purchase-orders/new">{t('أمر شراء جديد')}</Button>}
                        />
                    </div>
                ) : (
                    <div className="mk-scroll overflow-x-auto">
                        <table className="w-full min-w-[760px] text-sm">
                            <thead className="mk-thead">
                                <tr>
                                    {COLUMNS.map((column) => (
                                        <th key={column} scope="col" className="px-4 py-3 text-start font-medium whitespace-nowrap">
                                            {column}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className={cn('divide-y divide-line transition-opacity', loading && orders.length > 0 && 'opacity-60')}>
                                {loading && orders.length === 0
                                    ? Array.from({ length: 4 }, (_, index) => (
                                          <tr key={index}>
                                              {COLUMNS.map((column) => (
                                                  <td key={column} className="px-4 py-4">
                                                      <Skeleton className="h-4 w-16" />
                                                  </td>
                                              ))}
                                          </tr>
                                      ))
                                    : orders.map((order) => (
                                          <tr key={order.purchase_order_id} className="cursor-pointer transition hover:bg-surface-2" onClick={() => navigate(`/dashboard/purchase-orders/${order.purchase_order_id}`)}>
                                              <td className="px-4 py-3.5">
                                                  <span className="block font-semibold text-ink">#{order.number}</span>
                                                  <span className="text-xs text-muted">{formatDate(order.created_at)}</span>
                                              </td>
                                              <td className="px-4 py-3.5 text-ink-2">{order.supplier.name}</td>
                                              <td className="px-4 py-3.5 text-ink-2">
                                                  {order.units_received > 0 && order.units_received < order.units_ordered
                                                      ? t('{received} من {ordered}', { received: formatNumber(order.units_received), ordered: formatNumber(order.units_ordered) })
                                                      : formatNumber(order.units_ordered)}
                                              </td>
                                              <td className="px-4 py-3.5 font-semibold whitespace-nowrap text-ink">{formatMoney(order.total)}</td>
                                              <td className="px-4 py-3.5 whitespace-nowrap text-ink-2">{order.expected_at ? formatDate(order.expected_at) : '—'}</td>
                                              <td className="px-4 py-3.5">
                                                  <PurchaseOrderStatusBadge status={order.status} />
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
        </>
    );
}
