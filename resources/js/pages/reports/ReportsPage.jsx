import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { TrendBadge } from '@/components/ui/Charts';
import { EmptyState, StatCard } from '@/components/ui/Display';
import { Input, Select } from '@/components/ui/Form';
import { Skeleton } from '@/components/ui/Spinner';
import {
    AffiliatesCard,
    DailyChartCard,
    GovernorateReturnsCard,
    GovernoratesCard,
    PaymentMethodsCard,
    ProfitableProductsCard,
    REPORT_PRESETS,
    StatusBreakdownCard,
    StockForecastCard,
    TopProductsCard,
    parseDate,
    presetRange,
    toDateString,
} from '@/features/reports/ReportWidgets';
import { t } from '@/i18n';
import { formatDate, formatMoney, formatNumber } from '@/lib/format';
import { reportsApi } from '@/services/reportsApi';

function ReportSkeleton() {
    return (
        <div className="flex flex-col gap-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 8 }, (_, index) => (
                    <Skeleton key={index} className="h-24 rounded-xl" />
                ))}
            </div>
            <Skeleton className="h-80 rounded-xl" />
        </div>
    );
}

/** Sales report for a chosen period (?period=30 or ?from=…&to=…), compared with the period before it. */
export function ReportsPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const preset = searchParams.get('period') ?? (searchParams.get('from') ? 'custom' : '30');
    const range = useMemo(
        () => (preset === 'custom' ? { from: searchParams.get('from') ?? presetRange(30).from, to: searchParams.get('to') ?? toDateString(new Date()) } : presetRange(preset in REPORT_PRESETS ? preset : 30)),
        [preset, searchParams],
    );
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            setReport(await reportsApi.get(range));
        } catch (loadError) {
            setError(loadError.message);
        } finally {
            setLoading(false);
        }
    }, [range]);

    useEffect(() => {
        load();
    }, [load]);

    const choosePreset = (value) => setSearchParams(value === 'custom' ? { from: range.from, to: range.to } : value === '30' ? {} : { period: value }, { replace: true });
    const setCustomDate = (key, value) => value && setSearchParams({ from: range.from, to: range.to, [key]: value }, { replace: true });

    const totals = report?.totals;
    const previous = report?.previous;

    return (
        <>
            <PageHeader
                title={t('التقارير')}
                description={report ? t('من {from} إلى {to} مقارنةً بالفترة السابقة لها', { from: formatDate(parseDate(report.period.from)), to: formatDate(parseDate(report.period.to)) }) : t('مبيعات متجرك وأداء منتجاتك ومسوقيك')}
                breadcrumbs={[t('لوحة التحكم'), t('الإدارة'), t('التقارير')]}
                actions={
                    <>
                        <Select value={preset} onChange={(event) => choosePreset(event.target.value)} options={Object.entries(REPORT_PRESETS).map(([value, label]) => ({ value, label }))} icon="bar-chart" aria-label={t('فترة التقرير')} className="h-10 w-48" />
                        {preset === 'custom' && (
                            <>
                                <Input type="date" value={range.from} max={range.to} onChange={(event) => setCustomDate('from', event.target.value)} aria-label={t('من تاريخ')} className="h-10 w-40" />
                                <Input type="date" value={range.to} min={range.from} max={toDateString(new Date())} onChange={(event) => setCustomDate('to', event.target.value)} aria-label={t('إلى تاريخ')} className="h-10 w-40" />
                            </>
                        )}
                    </>
                }
            />

            {error ? (
                <EmptyState icon="alert-triangle" title={t('تعذر تحميل التقرير')} description={error} action={<Button variant="secondary" icon="refresh" onClick={load}>{t('إعادة المحاولة')}</Button>} />
            ) : !report ? (
                <ReportSkeleton />
            ) : (
                <div className={loading ? 'flex flex-col gap-6 opacity-60 transition-opacity' : 'flex flex-col gap-6 transition-opacity'}>
                    <div className="mk-stat-group sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard
                            label={t('المبيعات')}
                            value={formatMoney(totals.sales)}
                            icon="bar-chart"
                            hint={
                                <>
                                    <TrendBadge current={totals.sales} previous={previous.sales} />
                                    {totals.discounts > 0 && <span className="ms-2 text-xs text-muted">{t('بعد خصومات {amount}', { amount: formatMoney(totals.discounts) })}</span>}
                                </>
                            }
                        />
                        <StatCard label={t('الإيرادات المحصّلة')} value={formatMoney(totals.revenue)} icon="wallet" tone="success" hint={<TrendBadge current={totals.revenue} previous={previous.revenue} />} />
                        <StatCard label={t('الطلبات')} value={formatNumber(totals.orders)} icon="shopping-bag" tone="info" hint={<TrendBadge current={totals.orders} previous={previous.orders} />} />
                        <StatCard label={t('متوسط قيمة الطلب')} value={formatMoney(totals.average_order)} icon="sparkles" tone="primary" hint={<TrendBadge current={totals.average_order} previous={previous.average_order} />} />
                        <StatCard label={t('الصافي بعد العمولات')} value={formatMoney(totals.net_revenue)} icon="check-circle" tone="success" hint={t('شامل {amount} رسوم شحن', { amount: formatMoney(totals.shipping_fees) })} />
                        <StatCard label={t('عمولات المسوقين')} value={formatMoney(totals.commissions)} icon="percent" tone="warning" hint={t('مكتسبة من الطلبات المسلّمة')} />
                        <StatCard label={t('عملاء جدد')} value={formatNumber(totals.new_customers)} icon="user-plus" tone="info" hint={<TrendBadge current={totals.new_customers} previous={previous.new_customers} />} />
                        <StatCard
                            label={t('ملغي ومرتجع')}
                            value={formatNumber(totals.cancelled + totals.returned)}
                            icon="x"
                            tone="danger"
                            hint={<TrendBadge current={totals.cancelled + totals.returned} previous={previous.cancelled + previous.returned} inverse />}
                        />
                    </div>

                    <div className="mk-stat-group sm:grid-cols-3">
                        <StatCard label={t('تكلفة البضاعة المباعة')} value={formatMoney(totals.cost_of_goods)} icon="box" tone="neutral" hint={t('للطلبات المسلّمة في الفترة')} />
                        <StatCard
                            label={t('إجمالي الربح')}
                            value={formatMoney(totals.gross_profit)}
                            icon="sparkles"
                            tone={totals.gross_profit < 0 ? 'danger' : 'success'}
                            hint={<TrendBadge current={totals.gross_profit} previous={previous.gross_profit} />}
                        />
                        <StatCard
                            label={t('هامش الربح')}
                            value={totals.profit_margin == null ? '—' : t('{value}%', { value: formatNumber(totals.profit_margin) })}
                            icon="percent"
                            tone="info"
                            hint={totals.uncosted_items ? t('{count} قطعة مباعة بدون تكلفة مسجلة', { count: formatNumber(totals.uncosted_items) }) : t('بعد الخصومات والتكلفة وعمولات المسوقين')}
                        />
                    </div>

                    <DailyChartCard daily={report.daily} description={t('المبيعات تشمل كل الطلبات غير الملغاة، والإيرادات المحصّلة تشمل الطلبات المسلّمة فقط')} />

                    <div className="grid gap-6 lg:grid-cols-2">
                        <StatusBreakdownCard statuses={report.statuses} />
                        <GovernoratesCard governorates={report.governorates} />
                        <PaymentMethodsCard methods={report.payment_methods ?? []} refunds={totals.refunds ?? 0} />
                        <TopProductsCard products={report.top_products} />
                        <ProfitableProductsCard products={report.profitable_products ?? []} />
                        <GovernorateReturnsCard governorates={report.governorate_returns ?? []} />
                        <StockForecastCard forecast={report.stock_forecast ?? []} />
                        <AffiliatesCard affiliates={report.affiliates} />
                    </div>
                </div>
            )}
        </>
    );
}
