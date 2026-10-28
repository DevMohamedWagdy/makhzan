import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Alert, Badge, EmptyState, StatCard, StatStrip } from '@/components/ui/Display';
import { Icon } from '@/components/ui/Icon';
import { Tabs } from '@/components/ui/Navigation';
import { Skeleton } from '@/components/ui/Spinner';
import { localized, t } from '@/i18n';
import { PRODUCT_STATUSES } from '@/lib/constants';
import { formatDate, formatMoney, formatNumber } from '@/lib/format';
import { inventoryApi } from '@/services/inventoryApi';

const DEAD_STOCK_DAYS = [30, 60, 90, 180];

/** What the stock is worth (per warehouse and per category) and what hasn't sold for a while. */
export function InventoryReportsPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const report = searchParams.get('report') === 'dead-stock' ? 'dead-stock' : 'value';

    return (
        <>
            <PageHeader
                title={t('تقارير المخزون')}
                description={t('قيمة البضاعة في كل مخزن وقسم، والأصناف التي لا تُباع')}
                breadcrumbs={[t('لوحة التحكم'), t('المخزون'), t('التقارير')]}
                actions={
                    <Button variant="secondary" icon="arrow-right" to="/dashboard/inventory">
                        {t('المخزون')}
                    </Button>
                }
            />

            <Tabs
                variant="segmented"
                tabs={[
                    { value: 'value', label: t('قيمة المخزون') },
                    { value: 'dead-stock', label: t('البضاعة الراكدة') },
                ]}
                value={report}
                onChange={(value) => setSearchParams(value === 'value' ? {} : { report: value }, { replace: true })}
                className="mb-6 w-fit"
            />

            {report === 'value' ? <ValueReport /> : <DeadStockReport />}
        </>
    );
}

function useReport(loader) {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    const load = useCallback(() => {
        setError(null);
        setData(null);
        loader()
            .then(setData)
            .catch((loadError) => setError(loadError.message));
    }, [loader]);

    useEffect(load, [load]);

    return { data, error, reload: load };
}

function ValueReport() {
    const { data, error, reload } = useReport(inventoryApi.valueReport);

    if (error) {
        return <EmptyState icon="alert-triangle" title={t('تعذر تحميل التقرير')} description={error} action={<Button variant="secondary" icon="refresh" onClick={reload}>{t('إعادة المحاولة')}</Button>} />;
    }

    if (!data) {
        return <ReportSkeleton />;
    }

    const { totals } = data;

    return (
        <div className="flex flex-col gap-6">
            <StatStrip>
                <StatCard label={t('قيمة المخزون بالتكلفة')} value={formatMoney(totals.cost_value)} icon="wallet" tone="primary" />
                <StatCard label={t('قيمته بسعر البيع')} value={formatMoney(totals.retail_value)} icon="shopping-bag" tone="info" />
                <StatCard label={t('الربح المتوقع')} value={formatMoney(totals.retail_value - totals.cost_value)} icon="bar-chart" tone="success" />
                <StatCard label={t('إجمالي القطع')} value={formatNumber(totals.units)} icon="box" tone="neutral" />
            </StatStrip>

            {totals.missing_cost > 0 && (
                <Alert tone="warning" title={t('{count} صنف بدون تكلفة', { count: formatNumber(totals.missing_cost) })}>
                    {t('قيمتها بالتكلفة محسوبة صفر. أضف التكلفة من صفحة المخزون ليكون التقرير دقيقاً.')}
                </Alert>
            )}

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <ValueTable title={t('حسب المخزن')} icon="warehouse" rows={data.warehouses} rowKey="warehouse_id" label={(row) => row.name} total={totals.cost_value} />
                <ValueTable title={t('حسب القسم')} icon="grid" rows={data.categories} rowKey="category_id" label={(row) => localized(row)} total={totals.cost_value} />
            </div>
        </div>
    );
}

function ValueTable({ title, icon, rows, rowKey, label, total }) {
    return (
        <section className="mk-card overflow-hidden">
            <header className="flex items-center gap-2 border-b border-line px-5 py-4">
                <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon name={icon} className="size-4" />
                </span>
                <h2 className="font-semibold text-ink">{title}</h2>
            </header>
            {rows.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted">{t('لا توجد بيانات بعد')}</p>
            ) : (
                <div className="mk-scroll overflow-x-auto">
                    <table className="w-full min-w-[520px] text-sm">
                        <thead className="mk-thead">
                            <tr>
                                <th className="px-4 py-3 text-start font-medium">{t('الاسم')}</th>
                                <th className="px-4 py-3 text-start font-medium">{t('القطع')}</th>
                                <th className="px-4 py-3 text-start font-medium">{t('بالتكلفة')}</th>
                                <th className="px-4 py-3 text-start font-medium">{t('بسعر البيع')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                            {rows.map((row) => {
                                const share = total > 0 ? Math.round((row.cost_value / total) * 100) : 0;

                                return (
                                    <tr key={row[rowKey]}>
                                        <td className="px-4 py-3">
                                            <span className="block font-medium text-ink">{label(row)}</span>
                                            <span className="mt-1.5 flex items-center gap-2">
                                                <span className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-3">
                                                    <span className="block h-full rounded-full bg-primary" style={{ width: `${share}%` }} />
                                                </span>
                                                <span className="text-2xs text-muted">{share}%</span>
                                            </span>
                                        </td>
                                        <td className="mk-num px-4 py-3 text-ink-2">{formatNumber(row.units)}</td>
                                        <td className="mk-num px-4 py-3 font-semibold whitespace-nowrap text-ink">{formatMoney(row.cost_value)}</td>
                                        <td className="mk-num px-4 py-3 whitespace-nowrap text-ink-2">{formatMoney(row.retail_value)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}

function DeadStockReport() {
    const [days, setDays] = useState(60);
    const loader = useCallback(() => inventoryApi.deadStock(days), [days]);
    const { data, error, reload } = useReport(loader);

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-ink-2">{t('لم تُبع منذ')}</span>
                <Tabs variant="segmented" tabs={DEAD_STOCK_DAYS.map((value) => ({ value, label: t('{days} يوم', { days: formatNumber(value) }) }))} value={days} onChange={setDays} />
            </div>

            {error ? (
                <EmptyState icon="alert-triangle" title={t('تعذر تحميل التقرير')} description={error} action={<Button variant="secondary" icon="refresh" onClick={reload}>{t('إعادة المحاولة')}</Button>} />
            ) : !data ? (
                <ReportSkeleton />
            ) : (
                <>
                    <StatStrip>
                        <StatCard label={t('أصناف راكدة')} value={formatNumber(data.totals.variants)} icon="snowflake" tone="info" />
                        <StatCard label={t('قطع راكدة')} value={formatNumber(data.totals.units)} icon="box" tone="neutral" />
                        <StatCard label={t('أموال مجمّدة فيها')} value={formatMoney(data.totals.cost_value)} icon="wallet" tone="danger" hint={t('بسعر التكلفة')} />
                    </StatStrip>

                    <section className="mk-card overflow-hidden">
                        {data.items.length === 0 ? (
                            <div className="p-6">
                                <EmptyState icon="check-circle" title={t('لا توجد بضاعة راكدة')} description={t('كل الأصناف المتوفرة بِيع منها شيء خلال آخر {days} يوم.', { days: formatNumber(days) })} />
                            </div>
                        ) : (
                            <>
                                <p className="border-b border-line px-5 py-3 text-xs text-muted">{t('مرتبة حسب الأموال المجمّدة. فكّر في خصم أو عرض أو إرجاعها للمورد.')}</p>
                                <div className="mk-scroll overflow-x-auto">
                                    <table className="w-full min-w-[720px] text-sm">
                                        <thead className="mk-thead">
                                            <tr>
                                                {[t('المنتج'), t('القسم'), t('المخزون'), t('القيمة بالتكلفة'), t('آخر بيع')].map((column) => (
                                                    <th key={column} className="px-4 py-3 text-start font-medium whitespace-nowrap">
                                                        {column}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-line">
                                            {data.items.map((item) => (
                                                <tr key={item.variant_id}>
                                                    <td className="px-4 py-3">
                                                        <Link to={`/dashboard/products/${item.product_id}`} className="block font-medium text-ink hover:text-primary">
                                                            {localized({ name: item.product_name, name_en: item.product_name_en })}
                                                        </Link>
                                                        <span className="flex flex-wrap items-center gap-2 text-xs text-muted">
                                                            {item.variant_title}
                                                            {item.status !== 'active' && <Badge tone={PRODUCT_STATUSES[item.status]?.tone ?? 'neutral'}>{PRODUCT_STATUSES[item.status]?.label ?? item.status}</Badge>}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-ink-2">{item.category ?? '—'}</td>
                                                    <td className="mk-num px-4 py-3 text-ink">{formatNumber(item.stock)}</td>
                                                    <td className="mk-num px-4 py-3 font-semibold whitespace-nowrap text-ink">{item.cost === null ? <span className="text-xs font-normal text-warning">{t('بدون تكلفة')}</span> : formatMoney(item.cost_value)}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-ink-2">{item.last_sold_at ? formatDate(item.last_sold_at) : <span className="text-muted">{t('لم يُبع أبداً')}</span>}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}

function ReportSkeleton() {
    return (
        <div className="flex flex-col gap-4">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-72 w-full rounded-xl" />
        </div>
    );
}
