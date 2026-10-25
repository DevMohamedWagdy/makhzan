import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Alert, Badge, EmptyState, StatCard } from '@/components/ui/Display';
import { Input, Select } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { Pagination } from '@/components/ui/Navigation';
import { Skeleton } from '@/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';
import { OrderDrawer } from '@/features/orders/OrderDrawer';
import { REPORT_PRESETS, parseDate, presetRange, toDateString } from '@/features/reports/ReportWidgets';
import { useDebouncedValue } from '@/hooks/common';
import { t } from '@/i18n';
import { PAYMENT_METHODS } from '@/lib/constants';
import { downloadCsv } from '@/lib/csv';
import { cn, formatDate, formatMoney, formatNumber, formatTime } from '@/lib/format';
import { paymentsApi } from '@/services/paymentsApi';

const ALL_TIME = 'all';
const PERIODS = { ...REPORT_PRESETS, [ALL_TIME]: t('كل الوقت') };

const COLUMNS = [t('التاريخ'), t('العملية'), t('الطلب'), t('العميل'), t('الطريقة'), t('المبلغ'), t('الحالة'), t('رقم العملية في Paymob')];

const STATUSES = {
    paid: { label: t('ناجحة'), tone: 'success', icon: 'check-circle' },
    partially_refunded: { label: t('ناجحة · مسترد جزء منها'), tone: 'success', icon: 'check-circle' },
    refunded: { label: t('ناجحة · مستردة بالكامل'), tone: 'success', icon: 'check-circle' },
    failed: { label: t('فشلت'), tone: 'danger', icon: 'x' },
    pending: { label: t('لم تكتمل بعد'), tone: 'warning', icon: 'clock' },
};

const FILTERS = {
    kind: [
        { value: '', label: t('كل العمليات') },
        { value: 'payment', label: t('مدفوعات') },
        { value: 'refund', label: t('استردادات') },
    ],
    status: [
        { value: '', label: t('كل الحالات') },
        { value: 'paid', label: t('ناجحة') },
        { value: 'failed', label: t('فشلت') },
        { value: 'pending', label: t('لم تكتمل بعد') },
    ],
    method: [
        { value: '', label: t('كل الطرق') },
        { value: 'card', label: PAYMENT_METHODS.card.label },
        { value: 'wallet', label: PAYMENT_METHODS.wallet.label },
    ],
};

function statusOf(row) {
    return row.kind === 'refund' ? { label: t('تم الاسترداد'), tone: 'info', icon: 'refresh' } : (STATUSES[row.status] ?? STATUSES.pending);
}

/**
 * Every Paymob payment attempt and refund of the store in one place, with period totals,
 * what needs attention (unpaid orders, money to give back), filters and a spreadsheet export.
 * Clicking a row opens its order (?order={id}).
 */
export function PaymentsPage() {
    const toast = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const period = searchParams.get('period') ?? (searchParams.get('from') ? 'custom' : '30');
    const filters = useMemo(() => {
        const range = period === ALL_TIME ? {} : period === 'custom' ? { from: searchParams.get('from') ?? presetRange(30).from, to: searchParams.get('to') ?? toDateString(new Date()) } : presetRange(period in REPORT_PRESETS ? period : 30);

        return { ...range, kind: searchParams.get('kind') ?? '', status: searchParams.get('status') ?? '', method: searchParams.get('method') ?? '', search: searchParams.get('search') ?? '' };
    }, [period, searchParams]);
    const page = Number(searchParams.get('page')) || 1;
    const openOrderId = searchParams.get('order');
    const [searchTerm, setSearchTerm] = useState(filters.search);
    const search = useDebouncedValue(searchTerm, 300);
    const [result, setResult] = useState(null);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [exporting, setExporting] = useState(false);

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
        if (search !== filters.search) {
            setQuery({ search });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const [list, totals] = await Promise.all([paymentsApi.list({ ...filters, page }), paymentsApi.summary({ from: filters.from, to: filters.to })]);

            setResult(list);
            setSummary(totals);
        } catch (loadError) {
            setError(loadError.message);
        } finally {
            setLoading(false);
        }
    }, [filters, page]);

    useEffect(() => {
        load();
    }, [load]);

    const choosePeriod = (value) => setQuery({ period: value === '30' || value === 'custom' ? '' : value, from: value === 'custom' ? (filters.from ?? presetRange(30).from) : '', to: value === 'custom' ? (filters.to ?? toDateString(new Date())) : '' });
    const setCustomDate = (key, value) => value && setQuery({ period: '', from: filters.from, to: filters.to, [key]: value });
    const closeOrder = useCallback(() => setQuery({ order: '' }), [setQuery]);

    const exportCsv = async () => {
        setExporting(true);

        try {
            const { data } = await paymentsApi.exportAll(filters);

            downloadCsv(`payments-${toDateString(new Date())}.csv`, [
                [t('التاريخ'), t('الوقت'), t('العملية'), t('رقم الطلب'), t('العميل'), t('الطريقة'), t('المبلغ'), t('الحالة'), t('رقم العملية في Paymob'), t('ملاحظة')],
                ...data.map((row) => [
                    formatDate(row.created_at),
                    formatTime(row.created_at),
                    row.kind === 'refund' ? t('استرداد') : t('دفع'),
                    row.order_number,
                    row.customer_name,
                    PAYMENT_METHODS[row.method]?.label ?? row.method,
                    row.kind === 'refund' ? -row.amount : row.amount,
                    statusOf(row).label,
                    row.transaction_id ?? '',
                    row.note ?? '',
                ]),
            ]);
        } catch (exportError) {
            toast.error(t('تعذر تصدير المدفوعات'), exportError.message);
        } finally {
            setExporting(false);
        }
    };

    const items = result?.data ?? [];
    const filtered = filters.kind || filters.status || filters.method || filters.search;

    return (
        <>
            <PageHeader
                title={t('المدفوعات')}
                description={filters.from ? t('عمليات Paymob من {from} إلى {to}', { from: formatDate(parseDate(filters.from)), to: formatDate(parseDate(filters.to)) }) : t('كل عمليات الدفع والاسترداد عبر Paymob')}
                breadcrumbs={[t('لوحة التحكم'), t('المبيعات'), t('المدفوعات')]}
                actions={
                    <>
                        <Select value={period} onChange={(event) => choosePeriod(event.target.value)} options={Object.entries(PERIODS).map(([value, label]) => ({ value, label }))} icon="clock" aria-label={t('الفترة')} className="h-10 w-48" />
                        {period === 'custom' && (
                            <>
                                <Input type="date" value={filters.from} max={filters.to} onChange={(event) => setCustomDate('from', event.target.value)} aria-label={t('من تاريخ')} className="h-10 w-40" />
                                <Input type="date" value={filters.to} min={filters.from} max={toDateString(new Date())} onChange={(event) => setCustomDate('to', event.target.value)} aria-label={t('إلى تاريخ')} className="h-10 w-40" />
                            </>
                        )}
                        <Button variant="secondary" icon="download" loading={exporting} disabled={!result || result.meta.total === 0} onClick={exportCsv}>
                            {t('تصدير')}
                        </Button>
                    </>
                }
            />

            {summary && !summary.connected && (
                <Alert tone="info" icon="credit-card" className="mb-6">
                    {t('لم تربط حساب Paymob بعد، فلن يستطيع العملاء الدفع أونلاين.')}{' '}
                    <Link to="/dashboard/settings?tab=payments" className="font-semibold text-primary hover:underline">
                        {t('اربط Paymob الآن')}
                    </Link>
                </Alert>
            )}

            {summary?.to_refund.count > 0 && (
                <Alert tone="warning" icon="alert-triangle" title={t('فلوس تحتاج ترجعها للعملاء')} className="mb-6">
                    <span className="flex flex-wrap items-center justify-between gap-3">
                        <span>{t('{count} طلب ملغي دفع أصحابه {amount} ولم تُسترد بعد.', { count: formatNumber(summary.to_refund.count), amount: formatMoney(summary.to_refund.amount) })}</span>
                        <Button size="sm" variant="secondary" icon="refresh" onClick={() => setQuery({ order: summary.to_refund.order_id })}>
                            {t('افتح الطلب')}
                        </Button>
                    </span>
                </Alert>
            )}

            <div className="mb-6 mk-stat-group sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label={t('تم تحصيله')} value={summary ? formatMoney(summary.collected) : '—'} icon="wallet" tone="success" hint={summary && t('{count} عملية ناجحة', { count: formatNumber(summary.successful) })} />
                <StatCard label={t('تم استرداده')} value={summary ? formatMoney(summary.refunded) : '—'} icon="refresh" tone="info" />
                <StatCard label={t('الصافي')} value={summary ? formatMoney(summary.net) : '—'} icon="sparkles" tone="primary" hint={summary && t('{count} محاولة فاشلة', { count: formatNumber(summary.failed) })} />
                <StatCard
                    label={t('بانتظار الدفع الآن')}
                    value={summary ? formatMoney(summary.awaiting.amount) : '—'}
                    icon="clock"
                    tone="warning"
                    hint={summary && (summary.awaiting.count > 0 ? <button type="button" className="text-primary hover:underline" onClick={() => setQuery({ status: 'pending', kind: '' })}>{t('{count} طلب لم يُدفع بعد', { count: formatNumber(summary.awaiting.count) })}</button> : t('لا يوجد'))}
                />
            </div>

            <section className="mk-card overflow-hidden">
                <div className="flex flex-wrap items-center gap-3 p-4">
                    <Input type="search" icon="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder={t('ابحث برقم الطلب أو رقم العملية...')} aria-label={t('بحث في المدفوعات')} className="lg:w-80" />
                    {Object.entries(FILTERS).map(([key, options]) => (
                        <Select key={key} value={filters[key]} onChange={(event) => setQuery({ [key]: event.target.value })} options={options} aria-label={options[0].label} className="sm:w-44" />
                    ))}
                </div>

                {error ? (
                    <div className="p-6">
                        <EmptyState icon="alert-triangle" title={t('تعذر تحميل المدفوعات')} description={error} action={<Button variant="secondary" icon="refresh" onClick={load}>{t('إعادة المحاولة')}</Button>} />
                    </div>
                ) : !loading && items.length === 0 ? (
                    <div className="p-6">
                        <EmptyState icon="credit-card" title={filtered ? t('لا توجد عمليات مطابقة') : t('لا توجد عمليات دفع في هذه الفترة')} description={t('كل دفع أونلاين أو استرداد عبر Paymob يظهر هنا، مع الطلب الذي يخصه.')} />
                    </div>
                ) : (
                    <div className="mk-scroll overflow-x-auto">
                        <table className="w-full min-w-[980px] text-sm">
                            <thead className="mk-thead">
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
                                    : items.map((row) => {
                                          const status = statusOf(row);
                                          const refund = row.kind === 'refund';

                                          return (
                                              <tr key={row.id} className="cursor-pointer transition hover:bg-surface-2" onClick={() => setQuery({ order: row.order_id })}>
                                                  <td className="px-4 py-3.5 whitespace-nowrap">
                                                      <span className="block text-ink">{formatDate(row.created_at)}</span>
                                                      <span className="text-xs text-muted">{formatTime(row.created_at)}</span>
                                                  </td>
                                                  <td className="px-4 py-3.5 whitespace-nowrap">
                                                      <span className={cn('inline-flex items-center gap-1.5 font-medium', refund ? 'text-info' : 'text-ink')}>
                                                          <Icon name={refund ? 'refresh' : 'credit-card'} className="size-4" />
                                                          {refund ? t('استرداد') : t('دفع')}
                                                      </span>
                                                  </td>
                                                  <td className="px-4 py-3.5 font-semibold whitespace-nowrap text-ink">#{row.order_number}</td>
                                                  <td className="px-4 py-3.5 text-ink-2">{row.customer_name}</td>
                                                  <td className="px-4 py-3.5 whitespace-nowrap text-ink-2">
                                                      <span className="block">{PAYMENT_METHODS[row.method]?.label ?? row.method}</span>
                                                      {row.source && <span className="ltr block text-start text-xs text-muted">{[row.source.brand, `•••• ${row.source.last4}`].filter(Boolean).join(' ')}</span>}
                                                  </td>
                                                  <td className={cn('ltr px-4 py-3.5 text-start font-semibold whitespace-nowrap', refund ? 'text-info' : row.status === 'failed' ? 'text-muted line-through' : 'text-ink')}>
                                                      {refund ? `-${formatMoney(row.amount)}` : formatMoney(row.amount)}
                                                  </td>
                                                  <td className="px-4 py-3.5">
                                                      <Badge tone={status.tone} icon={status.icon}>
                                                          {status.label}
                                                      </Badge>
                                                      {row.note && <span className="mt-1 block max-w-56 truncate text-xs text-muted" title={row.note}>{row.note}</span>}
                                                  </td>
                                                  <td className="ltr px-4 py-3.5 text-start font-mono text-xs text-ink-2">{row.transaction_id ?? '—'}</td>
                                              </tr>
                                          );
                                      })}
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
