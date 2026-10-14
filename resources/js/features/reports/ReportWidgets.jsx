import { useState } from 'react';
import { Badge, Card } from '@/components/ui/Display';
import { BarList, ColumnChart, SegmentedBar } from '@/components/ui/Charts';
import { Tabs } from '@/components/ui/Navigation';
import { intlLocale, t } from '@/i18n';
import { ORDER_STATUSES, PAYMENT_METHODS } from '@/lib/constants';
import { formatMoney, formatNumber } from '@/lib/format';
import { findGovernorate } from '@/lib/locations';

const dayLabel = new Intl.DateTimeFormat(intlLocale, { day: 'numeric', month: 'short' });

/** Y-m-d in the browser's time zone (what the date inputs and the API expect). */
export function toDateString(date) {
    const pad = (value) => String(value).padStart(2, '0');

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Period choices shared by date-filtered dashboard pages (reports, payments). */
export const REPORT_PRESETS = {
    7: t('آخر ٧ أيام'),
    30: t('آخر ٣٠ يوماً'),
    90: t('آخر ٩٠ يوماً'),
    month: t('هذا الشهر'),
    last_month: t('الشهر الماضي'),
    custom: t('فترة مخصصة'),
};

/** The from/to dates (Y-m-d) a preset stands for, relative to today. */
export function presetRange(preset) {
    const today = new Date();

    if (preset === 'month') {
        return { from: toDateString(new Date(today.getFullYear(), today.getMonth(), 1)), to: toDateString(today) };
    }

    if (preset === 'last_month') {
        return { from: toDateString(new Date(today.getFullYear(), today.getMonth() - 1, 1)), to: toDateString(new Date(today.getFullYear(), today.getMonth(), 0)) };
    }

    const from = new Date(today);
    from.setDate(today.getDate() - Number(preset) + 1);

    return { from: toDateString(from), to: toDateString(today) };
}

/** Midnight of a Y-m-d date in the browser's time zone. */
export function parseDate(value) {
    const [year, month, day] = value.split('-').map(Number);

    return new Date(year, month - 1, day);
}

const METRICS = {
    sales: { label: t('المبيعات'), format: formatMoney },
    revenue: { label: t('الإيرادات المحصّلة'), format: formatMoney },
    orders: { label: t('عدد الطلبات'), format: formatNumber },
};

/** Daily sales / collected revenue / orders, one measure at a time. */
export function DailyChartCard({ daily, title = t('أداء المبيعات اليومي'), description }) {
    const [metric, setMetric] = useState('sales');
    const config = METRICS[metric];

    return (
        <Card title={title} description={description} bodyClassName="p-0">
            <Tabs tabs={Object.entries(METRICS).map(([value, { label }]) => ({ value, label }))} value={metric} onChange={setMetric} className="px-3" />
            <div className="p-5">
                <ColumnChart
                    caption={config.label}
                    formatValue={config.format}
                    data={daily.map((day) => ({
                        key: day.date,
                        label: dayLabel.format(parseDate(day.date)),
                        value: day[metric],
                        detail: metric === 'orders' ? undefined : t('{count} طلب', { count: formatNumber(day.orders) }),
                    }))}
                />
            </div>
        </Card>
    );
}

export function StatusBreakdownCard({ statuses }) {
    const total = Object.values(statuses).reduce((sum, count) => sum + count, 0);

    return (
        <Card title={t('الطلبات حسب الحالة')} description={t('{count} طلب في هذه الفترة', { count: formatNumber(total) })}>
            {total === 0 ? (
                <p className="rounded-xl border border-dashed border-line-strong p-5 text-center text-sm text-muted">{t('لا توجد طلبات في هذه الفترة.')}</p>
            ) : (
                <SegmentedBar segments={Object.entries(ORDER_STATUSES).map(([key, config]) => ({ key, label: config.label, tone: config.tone, value: statuses[key] ?? 0 }))} />
            )}
        </Card>
    );
}

export function TopProductsCard({ products, limit = 10 }) {
    return (
        <Card title={t('الأكثر مبيعاً')} description={t('بالكمية، من الطلبات غير الملغاة')}>
            <BarList
                items={products.slice(0, limit).map((product) => ({
                    key: product.product_id ?? product.name,
                    label: product.name,
                    value: product.quantity,
                    display: t('{count} قطعة', { count: formatNumber(product.quantity) }),
                    detail: formatMoney(product.sales),
                }))}
            />
        </Card>
    );
}

export function GovernoratesCard({ governorates }) {
    return (
        <Card title={t('المبيعات حسب المحافظة')}>
            <BarList
                items={governorates.map((row) => ({
                    key: row.governorate_id,
                    label: findGovernorate(row.governorate_id)?.name ?? row.governorate_id,
                    value: row.sales,
                    display: formatMoney(row.sales),
                    detail: t('{count} طلب', { count: formatNumber(row.orders) }),
                }))}
            />
        </Card>
    );
}

/** Sales by how customers paid, with the total refunded to online payers. */
export function PaymentMethodsCard({ methods, refunds }) {
    return (
        <Card title={t('المبيعات حسب طريقة الدفع')} description={refunds > 0 ? t('تم استرداد {amount} للعملاء في هذه الفترة', { amount: formatMoney(refunds) }) : undefined}>
            <BarList
                items={methods
                    .filter((row) => row.orders > 0)
                    .map((row) => ({
                        key: row.method,
                        label: PAYMENT_METHODS[row.method]?.label ?? row.method,
                        value: row.sales,
                        display: formatMoney(row.sales),
                        detail: t('{count} طلب', { count: formatNumber(row.orders) }),
                    }))}
            />
        </Card>
    );
}

export function AffiliatesCard({ affiliates }) {
    return (
        <Card title={t('أفضل المسوقين')} description={t('مبيعات روابطهم والعمولة المكتسبة من الطلبات المسلّمة')}>
            <BarList
                emptyText={t('لا توجد طلبات من المسوقين في هذه الفترة.')}
                items={affiliates.map((row) => ({
                    key: row.affiliate_id,
                    label: row.full_name,
                    value: row.sales,
                    display: formatMoney(row.sales),
                    detail: t('{count} طلب · عمولة {amount}', { count: formatNumber(row.orders), amount: formatMoney(row.commission) }),
                }))}
            />
        </Card>
    );
}

/** Products ranked by the profit of their delivered sales (lines without a recorded cost left out). */
export function ProfitableProductsCard({ products }) {
    return (
        <Card title={t('الأكثر ربحية')} description={t('صافي الربح بعد التكلفة، من الطلبات المسلّمة')}>
            <BarList
                emptyText={t('لا توجد مبيعات مسلّمة بتكلفة مسجلة في هذه الفترة.')}
                items={products.map((product) => ({
                    key: product.product_id ?? product.name,
                    label: product.name,
                    value: Math.max(product.profit, 0),
                    display: formatMoney(product.profit),
                    detail: t('{count} قطعة · مبيعات {sales} · هامش {margin}%', {
                        count: formatNumber(product.quantity),
                        sales: formatMoney(product.sales),
                        margin: formatNumber(product.margin ?? 0),
                    }),
                }))}
            />
        </Card>
    );
}

/** Return rate per governorate: returned out of orders that reached the customer. */
export function GovernorateReturnsCard({ governorates }) {
    const rateTone = (rate) => (rate == null ? 'neutral' : rate >= 20 ? 'danger' : rate >= 10 ? 'warning' : 'success');

    return (
        <Card title={t('المرتجعات حسب المحافظة')} description={t('نسبة المرتجع من الطلبات التي وصلت للعميل')}>
            {governorates.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line-strong p-5 text-center text-sm text-muted">{t('لا توجد طلبات في هذه الفترة.')}</p>
            ) : (
                <ul className="flex flex-col divide-y divide-line">
                    {governorates.map((row) => (
                        <li key={row.governorate_id} className="flex items-center justify-between gap-3 py-2.5 text-sm first:pt-0 last:pb-0">
                            <span className="min-w-0">
                                <span className="block truncate font-medium text-ink">{findGovernorate(row.governorate_id)?.name ?? row.governorate_id}</span>
                                <span className="text-xs text-muted">
                                    {t('{orders} طلب · {delivered} مسلّم · {returned} مرتجع · {cancelled} ملغي', {
                                        orders: formatNumber(row.orders),
                                        delivered: formatNumber(row.delivered),
                                        returned: formatNumber(row.returned),
                                        cancelled: formatNumber(row.cancelled),
                                    })}
                                </span>
                            </span>
                            <Badge tone={rateTone(row.return_rate)}>{row.return_rate == null ? '—' : t('{value}%', { value: formatNumber(row.return_rate) })}</Badge>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}

/** Variants that will sell out soon at their last-30-days pace, soonest first. */
export function StockForecastCard({ forecast }) {
    return (
        <Card title={t('توقع نفاد المخزون')} description={t('حسب معدل البيع في آخر ٣٠ يوماً، المنتجات التي ستنفد خلال شهر')}>
            {forecast.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line-strong p-5 text-center text-sm text-muted">{t('مخزونك يكفي أكثر من شهر بمعدل البيع الحالي.')}</p>
            ) : (
                <ul className="flex flex-col divide-y divide-line">
                    {forecast.map((row) => (
                        <li key={row.variant_id} className="flex items-center justify-between gap-3 py-2.5 text-sm first:pt-0 last:pb-0">
                            <span className="min-w-0">
                                <span className="block truncate font-medium text-ink">{[row.name, row.variant_title].filter(Boolean).join(' · ')}</span>
                                <span className="text-xs text-muted">
                                    {t('متبقي {stock} · يباع {rate} يومياً', { stock: formatNumber(row.stock), rate: formatNumber(row.daily_rate) })}
                                </span>
                            </span>
                            <Badge tone={row.days_left === 0 ? 'danger' : row.days_left <= 7 ? 'warning' : 'info'}>
                                {row.days_left === 0 ? t('نفد') : t('خلال {count} يوم', { count: formatNumber(row.days_left) })}
                            </Badge>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}
