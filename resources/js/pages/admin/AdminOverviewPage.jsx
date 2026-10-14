import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { BarList, ColumnChart, SegmentedBar } from '@/components/ui/Charts';
import { Badge, Card, EmptyState, StatCard } from '@/components/ui/Display';
import { Tabs } from '@/components/ui/Navigation';
import { Skeleton } from '@/components/ui/Spinner';
import { actorLabel, eventLabel, eventTone } from '@/features/activity/activityLabels';
import { parseDate } from '@/features/reports/ReportWidgets';
import { intlLocale, t } from '@/i18n';
import { formatDate, formatMoney, formatNumber, formatRelative } from '@/lib/format';
import { adminApi } from '@/services/adminApi';

const dayLabel = new Intl.DateTimeFormat(intlLocale, { day: 'numeric', month: 'short' });
const monthLabel = new Intl.DateTimeFormat(intlLocale, { month: 'short', year: '2-digit' });

const DAILY_METRICS = {
    stores: { label: t('متاجر جديدة'), format: formatNumber },
    orders: { label: t('الطلبات'), format: formatNumber },
    sales: { label: t('المبيعات المسلّمة'), format: formatMoney },
};

export function BillingBadge({ billing }) {
    if (billing.status === 'active') {
        return <Badge tone="success">{billing.plan.name}</Badge>;
    }

    if (billing.status === 'trial') {
        return <Badge tone="info">{t('تجريبي · {days} يوم', { days: billing.days_left })}</Badge>;
    }

    return billing.status === 'expired' ? <Badge tone="warning">{t('منتهي')}</Badge> : <Badge tone="neutral">{t('بدون حدود')}</Badge>;
}

/** The platform at a glance: stores and billing, 30-day activity, revenue, and what needs attention. */
export function AdminOverviewPage() {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [metric, setMetric] = useState('stores');

    const load = useCallback(() => {
        setError(null);
        adminApi
            .overview()
            .then(setData)
            .catch((loadError) => setError(loadError.message));
    }, []);

    useEffect(load, [load]);

    return (
        <>
            <PageHeader title={t('نظرة عامة')} description={t('حالة المنصة خلال آخر ٣٠ يوماً')} />

            {error ? (
                <EmptyState icon="alert-triangle" title={t('تعذر تحميل البيانات')} description={error} action={<Button variant="secondary" icon="refresh" onClick={load}>{t('إعادة المحاولة')}</Button>} />
            ) : !data ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
                        <Skeleton key={index} className="h-24 rounded-xl" />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    {data.billing.pending_requests > 0 && (
                        <Link to="/admin/requests" className="mk-card flex items-center justify-between gap-3 border-primary/40 bg-primary-soft/40 p-4 text-sm font-semibold text-primary">
                            {t('{count} طلب اشتراك بانتظار المراجعة', { count: formatNumber(data.billing.pending_requests) })}
                            <span aria-hidden>←</span>
                        </Link>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard label={t('إجمالي المتاجر')} value={formatNumber(data.stores.total)} icon="store" hint={t('{count} متجر جديد', { count: formatNumber(data.stores.new_30_days) })} />
                        <StatCard label={t('متاجر مشتركة')} value={formatNumber(data.stores.paying)} icon="zap" tone="success" hint={t('{count} تنتهي خلال ٧ أيام', { count: formatNumber(data.stores.expiring_7_days) })} />
                        <StatCard label={t('في الفترة التجريبية')} value={formatNumber(data.stores.on_trial)} icon="clock" tone="info" hint={t('{count} انتهت دون اشتراك', { count: formatNumber(data.stores.expired) })} />
                        <StatCard label={t('إيرادات الاشتراكات')} value={formatMoney(data.billing.revenue_30_days)} icon="wallet" tone="warning" hint={t('الإجمالي {amount}', { amount: formatMoney(data.billing.revenue_total) })} />
                        <StatCard label={t('طلبات المتاجر')} value={formatNumber(data.orders.last_30_days)} icon="shopping-bag" hint={t('الإجمالي {count}', { count: formatNumber(data.totals.orders) })} />
                        <StatCard label={t('مبيعات مسلّمة')} value={formatMoney(data.orders.delivered_sales_30_days)} icon="bar-chart" tone="success" hint={t('الإجمالي {amount}', { amount: formatMoney(data.totals.delivered_sales) })} />
                        <StatCard label={t('التجار وفرقهم')} value={formatNumber(data.totals.vendors)} icon="users" tone="info" hint={t('{count} موظف', { count: formatNumber(data.totals.staff) })} />
                        <StatCard label={t('المنتجات والعملاء')} value={formatNumber(data.totals.products)} icon="box" tone="warning" hint={t('{count} عميل', { count: formatNumber(data.totals.customers) })} />
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
                        <Card title={t('آخر ٣٠ يوماً')} bodyClassName="p-0">
                            <Tabs tabs={Object.entries(DAILY_METRICS).map(([value, { label }]) => ({ value, label }))} value={metric} onChange={setMetric} className="px-3" />
                            <div className="p-5">
                                <ColumnChart caption={DAILY_METRICS[metric].label} formatValue={DAILY_METRICS[metric].format} data={data.daily.map((day) => ({ key: day.date, label: dayLabel.format(parseDate(day.date)), value: day[metric] }))} />
                            </div>
                        </Card>
                        <Card title={t('حالة المتاجر')}>
                            <SegmentedBar
                                segments={[
                                    { key: 'paying', label: t('مشتركة'), value: data.stores.paying, tone: 'success' },
                                    { key: 'trial', label: t('تجريبية'), value: data.stores.on_trial, tone: 'info' },
                                    { key: 'expired', label: t('منتهية'), value: data.stores.expired, tone: 'warning' },
                                    { key: 'suspended', label: t('موقوفة'), value: data.stores.suspended, tone: 'danger' },
                                ]}
                            />
                            <h4 className="mt-6 mb-3 text-sm font-semibold text-ink">{t('المشتركون حسب الباقة')}</h4>
                            <BarList items={data.plans.map((plan) => ({ key: plan.plan_id, label: plan.name, value: plan.stores, display: formatNumber(plan.stores) }))} emptyText={t('لا توجد باقات بعد.')} />
                        </Card>
                    </div>

                    <Card title={t('إيرادات الاشتراكات الشهرية')}>
                        <ColumnChart caption={t('الإيرادات')} formatValue={formatMoney} data={data.monthly_revenue.map((month) => ({ key: month.month, label: monthLabel.format(parseDate(`${month.month}-01`)), value: month.revenue }))} />
                    </Card>

                    <div className="grid gap-6 lg:grid-cols-3">
                        <Card title={t('أحدث المتاجر')} actions={<Link to="/admin/stores" className="text-sm font-medium text-primary hover:underline">{t('الكل')}</Link>}>
                            <ul className="divide-y divide-line">
                                {data.latest_stores.map((store) => (
                                    <li key={store.store_id}>
                                        <Link to={`/admin/stores/${store.store_id}`} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-primary">
                                            <span>
                                                <span className="block font-medium text-ink">{store.name}</span>
                                                <span className="text-xs text-muted">{store.owner} · {formatRelative(store.created_at)}</span>
                                            </span>
                                            <BillingBadge billing={store.billing} />
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                        <Card title={t('فترات تجريبية تنتهي قريباً')}>
                            {data.trials_ending.length === 0 ? (
                                <p className="text-sm text-muted">{t('لا يوجد خلال ٣ أيام.')}</p>
                            ) : (
                                <ul className="divide-y divide-line">
                                    {data.trials_ending.map((store) => (
                                        <li key={store.store_id}>
                                            <Link to={`/admin/stores/${store.store_id}`} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-primary">
                                                <span className="font-medium text-ink">{store.name}</span>
                                                <span className="text-xs text-warning">{formatDate(store.trial_ends_at)}</span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <h4 className="mt-6 mb-3 text-sm font-semibold text-ink">{t('الأعلى مبيعاً (٣٠ يوماً)')}</h4>
                            <BarList items={data.top_stores.map((store) => ({ key: store.store_id, label: store.name, value: store.delivered_sales, display: formatMoney(store.delivered_sales) }))} emptyText={t('لا توجد مبيعات بعد.')} />
                        </Card>
                        <Card title={t('أحدث النشاط')} actions={<Link to="/admin/logs" className="text-sm font-medium text-primary hover:underline">{t('السجل')}</Link>}>
                            <ul className="flex flex-col gap-2.5">
                                {data.recent_activity.map((log) => (
                                    <li key={log.log_id} className="text-sm">
                                        <span className="flex items-center gap-2">
                                            <Badge tone={eventTone(log.event)}>{eventLabel(log.event)}</Badge>
                                            <span className="truncate text-ink">{log.subject.label}</span>
                                        </span>
                                        <span className="text-xs text-muted">
                                            {actorLabel(log.actor)}
                                            {log.store && ` · ${log.store.name}`} · {formatRelative(log.created_at)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    </div>
                </div>
            )}
        </>
    );
}
