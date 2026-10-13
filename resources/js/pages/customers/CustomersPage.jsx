import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Avatar, EmptyState, StatCard } from '@/components/ui/Display';
import { Input, Select } from '@/components/ui/Form';
import { Pagination, Tabs } from '@/components/ui/Navigation';
import { Skeleton } from '@/components/ui/Spinner';
import { CustomerDrawer } from '@/features/customers/CustomerDrawer';
import { useDebouncedValue } from '@/hooks/common';
import { t } from '@/i18n';
import { cn, formatDate, formatMoney, formatNumber, formatRelative } from '@/lib/format';
import { customersApi } from '@/services/customersApi';

const COLUMNS = [t('العميل'), t('الهاتف'), t('الطلبات'), t('إجمالي المشتريات'), t('آخر طلب'), t('تاريخ التسجيل')];

const SORTS = [
    { value: 'recent', label: t('الأحدث تسجيلاً') },
    { value: 'last_order', label: t('آخر طلب') },
    { value: 'orders', label: t('الأكثر طلباً') },
    { value: 'spent', label: t('الأعلى إنفاقاً') },
];

/** The store's shoppers with search, sorting, and the customer drawer (?customer={id}). */
export function CustomersPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const page = Number(searchParams.get('page')) || 1;
    const sort = searchParams.get('sort') ?? 'recent';
    const buyers = searchParams.get('buyers') === '1';
    const searchQuery = searchParams.get('search') ?? '';
    const openCustomerId = searchParams.get('customer');
    const [searchTerm, setSearchTerm] = useState(searchQuery);
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

                    Object.entries({ ...patch, ...(!('page' in patch) && !('customer' in patch) && { page: 1 }) }).forEach(([key, value]) =>
                        value === '' || value == null || (key === 'page' && value === 1) || (key === 'sort' && value === 'recent') ? next.delete(key) : next.set(key, value),
                    );

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
            const [list, counts] = await Promise.all([customersApi.list({ search: searchQuery, sort, buyers: buyers ? 1 : undefined, page }), customersApi.summary()]);

            setResult(list);
            setSummary(counts);
        } catch (loadError) {
            setError(loadError.message);
        } finally {
            setLoading(false);
        }
    }, [searchQuery, sort, buyers, page]);

    useEffect(() => {
        load();
    }, [load]);

    const items = result?.data ?? [];
    const repeatRate = summary?.buyers ? Math.round((summary.repeat_buyers / summary.buyers) * 100) : 0;

    return (
        <>
            <PageHeader title={t('العملاء')} description={t('عملاء متجرك الذين سجّلوا حساباً، وطلباتهم ومشترياتهم')} breadcrumbs={[t('لوحة التحكم'), t('المبيعات'), t('العملاء')]} />

            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label={t('كل العملاء')} value={summary ? formatNumber(summary.total) : '—'} icon="users" />
                <StatCard label={t('سجّلوا هذا الشهر')} value={summary ? formatNumber(summary.new_this_month) : '—'} icon="user-plus" tone="info" />
                <StatCard label={t('عملاء اشتروا')} value={summary ? formatNumber(summary.buyers) : '—'} icon="shopping-bag" tone="success" />
                <StatCard label={t('عملاء متكررون')} value={summary ? formatNumber(summary.repeat_buyers) : '—'} icon="refresh" tone="warning" hint={summary && t('{value}% من المشترين طلبوا أكثر من مرة', { value: formatNumber(repeatRate) })} />
            </div>

            <section className="mk-card overflow-hidden">
                <Tabs
                    tabs={[
                        { value: '', label: t('كل العملاء'), count: summary?.total },
                        { value: '1', label: t('اشتروا من المتجر'), count: summary?.buyers },
                    ]}
                    value={buyers ? '1' : ''}
                    onChange={(value) => setQuery({ buyers: value })}
                    className="px-3"
                />
                <div className="flex flex-wrap items-center gap-3 p-4">
                    <Input type="search" icon="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder={t('ابحث بالاسم أو الهاتف أو البريد...')} aria-label={t('بحث في العملاء')} className="lg:w-96" />
                    <Select value={sort} onChange={(event) => setQuery({ sort: event.target.value })} options={SORTS} icon="filter" aria-label={t('ترتيب العملاء')} className="w-52" />
                </div>

                {error ? (
                    <div className="p-6">
                        <EmptyState icon="alert-triangle" title={t('تعذر تحميل العملاء')} description={error} action={<Button variant="secondary" icon="refresh" onClick={load}>{t('إعادة المحاولة')}</Button>} />
                    </div>
                ) : !loading && items.length === 0 ? (
                    <div className="p-6">
                        <EmptyState icon="users" title={searchQuery || buyers ? t('لا يوجد عملاء مطابقون') : t('لا يوجد عملاء بعد')} description={t('يُنشئ العملاء حساباتهم عند الطلب من متجرك، وسيظهرون هنا تلقائياً.')} />
                    </div>
                ) : (
                    <div className="mk-scroll overflow-x-auto">
                        <table className="w-full min-w-[760px] text-sm">
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
                                    : items.map((customer) => (
                                          <tr key={customer.customer_id} className="cursor-pointer transition hover:bg-surface-2" onClick={() => setQuery({ customer: customer.customer_id })}>
                                              <td className="px-4 py-3">
                                                  <span className="flex items-center gap-3">
                                                      <Avatar name={customer.full_name} size="sm" />
                                                      <span className="min-w-0">
                                                          <span className="block font-medium text-ink">{customer.full_name}</span>
                                                          {customer.email && <span className="ltr block truncate text-start text-xs text-muted">{customer.email}</span>}
                                                      </span>
                                                  </span>
                                              </td>
                                              <td className="ltr px-4 py-3 text-start whitespace-nowrap text-ink-2">{customer.phone}</td>
                                              <td className="px-4 py-3 text-ink-2">
                                                  <span className="block">{formatNumber(customer.stats.orders_count)}</span>
                                                  {customer.stats.failed_orders > 0 && <span className="block text-xs whitespace-nowrap text-danger">{t('({count} ملغي/مرتجع)', { count: formatNumber(customer.stats.failed_orders) })}</span>}
                                              </td>
                                              <td className="px-4 py-3 font-semibold whitespace-nowrap text-ink">{formatMoney(customer.stats.total_spent)}</td>
                                              <td className="px-4 py-3 whitespace-nowrap text-ink-2">{customer.last_order_at ? formatRelative(customer.last_order_at) : '—'}</td>
                                              <td className="px-4 py-3 whitespace-nowrap text-muted">{formatDate(customer.created_at)}</td>
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

            <CustomerDrawer customerId={openCustomerId} onClose={() => setQuery({ customer: '' })} />
        </>
    );
}
