import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { TrendBadge } from '@/components/ui/Charts';
import { Card, EmptyState, StatCard } from '@/components/ui/Display';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { OrderStatusBadge } from '@/features/orders/OrderBadges';
import { DailyChartCard, TopProductsCard } from '@/features/reports/ReportWidgets';
import { t } from '@/i18n';
import { cn, formatMoney, formatNumber, formatRelative } from '@/lib/format';
import { affiliatesApi } from '@/services/affiliatesApi';
import { ordersApi } from '@/services/ordersApi';
import { productsApi } from '@/services/productsApi';
import { reportsApi } from '@/services/reportsApi';

const ATTENTION_TONES = {
    warning: 'bg-warning-soft text-warning',
    danger: 'bg-danger-soft text-danger',
    primary: 'bg-primary-soft text-primary',
    info: 'bg-info-soft text-info',
};

/** Things waiting on the vendor, each linking to the page where it's handled. */
function NeedsAttention({ items }) {
    const open = items.filter((item) => item.count > 0);

    if (open.length === 0) {
        return (
            <div className="mk-card flex items-center gap-3 p-4 text-sm text-ink-2">
                <span className="grid size-9 place-items-center rounded-xl bg-success-soft text-success">
                    <Icon name="check-circle" className="size-5" />
                </span>
                {t('لا يوجد ما ينتظرك الآن، كل شيء تحت السيطرة.')}
            </div>
        );
    }

    return (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {open.map((item) => (
                <Link key={item.key} to={item.to} className="mk-card group flex items-center gap-3 p-4 transition hover:border-line-strong">
                    <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', ATTENTION_TONES[item.tone])}>
                        <Icon name={item.icon} className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-lg leading-tight font-bold text-ink">{formatNumber(item.count)}</span>
                        <span className="block truncate text-xs text-muted">{item.label}</span>
                    </span>
                    <Icon name="chevron-left" className="size-4 text-muted transition group-hover:text-ink" />
                </Link>
            ))}
        </div>
    );
}

function RecentOrders({ orders }) {
    if (orders.length === 0) {
        return <EmptyState icon="shopping-bag" title={t('لا توجد طلبات بعد')} description={t('شارك رابط متجرك، وستظهر طلبات عملائك هنا.')} />;
    }

    return (
        <ul className="-my-2 divide-y divide-line">
            {orders.map((order) => (
                <li key={order.order_id}>
                    <Link to={`/dashboard/orders?order=${order.order_id}`} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 transition hover:bg-surface-2">
                        <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                                <span className="font-semibold text-ink">#{order.number}</span>
                                <span className="truncate text-sm text-ink-2">{order.address.recipient_name}</span>
                            </span>
                            <span className="text-xs text-muted">{formatRelative(order.created_at)}</span>
                        </span>
                        <span className="flex flex-col items-end gap-1">
                            <span className="text-sm font-semibold text-ink">{formatMoney(order.total)}</span>
                            <OrderStatusBadge status={order.status} />
                        </span>
                    </Link>
                </li>
            ))}
        </ul>
    );
}

/** The vendor's home: what needs attention, the last 30 days at a glance and the latest orders. */
export function DashboardHomePage() {
    const { vendor } = useAuth();
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {
        setError(null);

        try {
            const [report, orders, products, affiliates, recent] = await Promise.all([reportsApi.get(), ordersApi.summary(), productsApi.summary(), affiliatesApi.summary(), ordersApi.list({ per_page: 10 })]);

            setData({ report, orders, products, affiliates, recent: recent.data.slice(0, 6) });
        } catch (loadError) {
            setError(loadError.message);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const firstName = vendor?.full_name?.split(' ')[0] ?? '';

    return (
        <>
            <PageHeader
                title={t('أهلاً {name} 👋', { name: firstName })}
                description={t('ملخص متجرك وما ينتظرك اليوم')}
                actions={
                    <>
                        <Button variant="secondary" icon="bar-chart" to="/dashboard/reports">
                            {t('التقارير التفصيلية')}
                        </Button>
                        <Button icon="plus" to="/dashboard/products/new">
                            {t('إضافة منتج')}
                        </Button>
                    </>
                }
            />

            {error ? (
                <EmptyState icon="alert-triangle" title={t('تعذر تحميل لوحة التحكم')} description={error} action={<Button variant="secondary" icon="refresh" onClick={load}>{t('إعادة المحاولة')}</Button>} />
            ) : !data ? (
                <div className="flex flex-col gap-6">
                    <Skeleton className="h-20 rounded-xl" />
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {[0, 1, 2, 3].map((index) => (
                            <Skeleton key={index} className="h-24 rounded-xl" />
                        ))}
                    </div>
                    <Skeleton className="h-80 rounded-xl" />
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    <NeedsAttention
                        items={[
                            { key: 'orders', label: t('طلب بانتظار التأكيد'), count: data.orders.pending, icon: 'shopping-bag', tone: 'warning', to: '/dashboard/orders?status=pending' },
                            { key: 'payouts', label: t('طلب تحويل عمولة'), count: data.affiliates.payout_requests, icon: 'send', tone: 'primary', to: '/dashboard/payout-requests' },
                            { key: 'applicants', label: t('مسوق بانتظار الموافقة'), count: data.affiliates.pending, icon: 'user-plus', tone: 'info', to: '/dashboard/affiliates?status=pending' },
                            { key: 'out', label: t('منتج نفد مخزونه'), count: data.products.out_of_stock, icon: 'box', tone: 'danger', to: '/dashboard/products?stock=out' },
                            { key: 'low', label: t('منتج مخزونه منخفض'), count: data.products.low_stock, icon: 'warehouse', tone: 'warning', to: '/dashboard/products?stock=low' },
                        ]}
                    />

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard label={t('طلبات اليوم')} value={formatNumber(data.orders.today)} icon="shopping-bag" hint={t('{count} قيد الشحن الآن', { count: formatNumber(data.orders.shipped) })} />
                        <StatCard label={t('مبيعات آخر ٣٠ يوماً')} value={formatMoney(data.report.totals.sales)} icon="bar-chart" tone="info" hint={<TrendBadge current={data.report.totals.sales} previous={data.report.previous.sales} />} />
                        <StatCard label={t('إيرادات محصّلة (٣٠ يوماً)')} value={formatMoney(data.report.totals.revenue)} icon="wallet" tone="success" hint={<TrendBadge current={data.report.totals.revenue} previous={data.report.previous.revenue} />} />
                        <StatCard label={t('عملاء جدد (٣٠ يوماً)')} value={formatNumber(data.report.totals.new_customers)} icon="users" tone="warning" hint={<TrendBadge current={data.report.totals.new_customers} previous={data.report.previous.new_customers} />} />
                    </div>

                    <DailyChartCard daily={data.report.daily} title={t('آخر ٣٠ يوماً')} />

                    <div className="grid gap-6 lg:grid-cols-5">
                        <Card
                            title={t('أحدث الطلبات')}
                            className="lg:col-span-3"
                            actions={
                                <Link to="/dashboard/orders" className="text-sm font-medium text-primary hover:underline">
                                    {t('كل الطلبات')}
                                </Link>
                            }
                        >
                            <RecentOrders orders={data.recent} />
                        </Card>
                        <div className="lg:col-span-2">
                            <TopProductsCard products={data.report.top_products} limit={5} />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
