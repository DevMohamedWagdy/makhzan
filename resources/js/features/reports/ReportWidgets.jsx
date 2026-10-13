import { useState } from 'react';
import { Card } from '@/components/ui/Display';
import { BarList, ColumnChart, SegmentedBar } from '@/components/ui/Charts';
import { Tabs } from '@/components/ui/Navigation';
import { intlLocale, t } from '@/i18n';
import { ORDER_STATUSES } from '@/lib/constants';
import { formatMoney, formatNumber } from '@/lib/format';
import { findGovernorate } from '@/lib/locations';

const dayLabel = new Intl.DateTimeFormat(intlLocale, { day: 'numeric', month: 'short' });

/** Y-m-d in the browser's time zone (what the date inputs and the API expect). */
export function toDateString(date) {
    const pad = (value) => String(value).padStart(2, '0');

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
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
