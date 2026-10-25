import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { PageHeader, allowedPages } from '@/components/layout/DashboardLayout';
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
    primary: 'bg-primary-soft text-brand-green',
    info: 'bg-info-soft text-info',
};

/** The strip spreads its cells over one row on wide screens, whatever their count. */
const ATTENTION_COLUMNS = { 1: 'grid-cols-1', 2: 'grid-cols-1 sm:grid-cols-2', 3: 'grid-cols-1 sm:grid-cols-3', 4: 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4', 5: 'grid-cols-1 sm:grid-cols-3 xl:grid-cols-5' };

/** Things waiting on the vendor, each linking to the page where it's handled. */
function NeedsAttention({ items }) {
    const open = items.filter((item) => item.count > 0);

    if (open.length === 0) {
        return null;
    }

    return (
        <div className={cn('mk-stat-group', ATTENTION_COLUMNS[Math.min(open.length, 5)])}>
            {open.map((item) => (
                <Link key={item.key} to={item.to} className="group flex items-center gap-3.5 px-5 py-4 transition hover:bg-surface-2">
                    <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg ring-1 ring-current/10 ring-inset', ATTENTION_TONES[item.tone])}>
                        <Icon name={item.icon} className="size-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="mk-num block text-lg leading-6 font-semibold text-ink">{formatNumber(item.count)}</span>
                        <span className="block truncate text-xs text-muted">{item.label}</span>
                    </span>
                    <Icon name="arrow-left" className="size-4 text-muted opacity-0 transition group-hover:opacity-100" />
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
                                <span className="mk-num font-semibold text-ink">#{order.number}</span>
                                <span className="truncate text-sm text-ink-2">{order.address.recipient_name}</span>
                            </span>
                            <span className="text-xs text-muted">{formatRelative(order.created_at)}</span>
                        </span>
                        <span className="flex flex-col items-end gap-1">
                            <span className="mk-num text-sm font-semibold text-ink">{formatMoney(order.total)}</span>
                            <OrderStatusBadge status={order.status} />
                        </span>
                    </Link>
                </li>
            ))}
        </ul>
    );
}

/** Sections the overview has widgets for; each widget shows only with its section's permission. */
const OVERVIEW_SECTIONS = ['reports', 'orders', 'products', 'affiliates', 'payouts'];

/** A line under some shortcuts on the limited home; the rest show their title alone. */
const SHORTCUT_DESCRIPTIONS = {
    '/dashboard/orders': t('تابع الطلبات الجديدة وغيّر حالتها'),
    '/dashboard/products': t('أضف المنتجات وعدّل أسعارها وصورها'),
    '/dashboard/inventory': t('الكميات والحركات والمخازن'),
    '/dashboard/purchase-orders': t('الموردين واستلام البضاعة'),
    '/dashboard/customers': t('بيانات العملاء وطلباتهم'),
    '/dashboard/affiliates': t('المسوقين وعمولاتهم'),
    '/dashboard/coupons': t('أكواد الخصم وحدودها'),
    '/dashboard/payments': t('المعاملات واسترداد المبالغ'),
    '/dashboard/reports': t('المبيعات والأرباح'),
    '/dashboard/settings': t('بيانات المتجر والشحن والسياسات'),
};

/**
 * The vendor's home. With the dashboard permission: the overview (each widget limited to the
 * sections the role allows), or shortcuts when it allows none of them. Without it, staff go
 * straight to the first page their role opens.
 */
export function DashboardHomePage() {
    const { can } = useAuth();

    if (!can('dashboard')) {
        const [firstPage] = allowedPages(can);

        return firstPage ? <Navigate to={firstPage.to} replace /> : <TeamMemberHome />;
    }

    return OVERVIEW_SECTIONS.some(can) ? <OverviewHome /> : <TeamMemberHome />;
}

function TeamMemberHome() {
    const { vendor, can } = useAuth();
    const shortcuts = allowedPages(can);

    return (
        <>
            <PageHeader title={t('أهلاً {name} 👋', { name: vendor?.full_name?.split(' ')[0] ?? '' })} description={t('الأقسام المتاحة لك في لوحة التحكم')} />

            {shortcuts.length === 0 ? (
                <EmptyState icon="lock" title={t('لم تُمنح أي صلاحيات بعد')} description={t('اطلب من صاحب المتجر تحديد الأقسام التي يمكنك العمل عليها.')} />
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {shortcuts.map((shortcut) => (
                        <Link key={shortcut.to} to={shortcut.to} className="mk-card mk-card-link group flex items-start gap-4 p-5">
                            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-brand-green ring-1 ring-primary/10 ring-inset">
                                <Icon name={shortcut.icon} className="size-5" />
                            </span>
                            <span>
                                <span className="block font-semibold text-ink group-hover:text-primary">{shortcut.label}</span>
                                {SHORTCUT_DESCRIPTIONS[shortcut.to] && <span className="text-sm text-muted">{SHORTCUT_DESCRIPTIONS[shortcut.to]}</span>}
                            </span>
                        </Link>
                    ))}
                </div>
            )}
        </>
    );
}

function OverviewHome() {
    const { vendor, can } = useAuth();
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {
        setError(null);

        try {
            // Only the sections this account can open are requested; the rest stay null and their widgets hidden.
            const [report, orders, products, affiliates, recent] = await Promise.all([
                can('reports') ? reportsApi.get() : null,
                can('orders') ? ordersApi.summary() : null,
                can('products') ? productsApi.summary() : null,
                can('affiliates') || can('payouts') ? affiliatesApi.summary() : null,
                can('orders') ? ordersApi.list({ per_page: 10 }) : null,
            ]);

            setData({ report, orders, products, affiliates, recent: recent?.data.slice(0, 6) ?? null });
        } catch (loadError) {
            setError(loadError.message);
        }
    }, [can]);

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
                        {can('reports') && (
                            <Button variant="secondary" icon="bar-chart" to="/dashboard/reports">
                                {t('التقارير التفصيلية')}
                            </Button>
                        )}
                        {can('products.create') && (
                            <Button icon="plus" to="/dashboard/products/new">
                                {t('إضافة منتج')}
                            </Button>
                        )}
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
                <div className="flex flex-col gap-8">
                    <div className="flex flex-col gap-3">
                        <NeedsAttention
                            items={[
                                data.orders && { key: 'orders', label: t('طلب بانتظار التأكيد'), count: data.orders.pending, icon: 'shopping-bag', tone: 'warning', to: '/dashboard/orders?status=pending' },
                                data.affiliates && can('payouts') && { key: 'payouts', label: t('طلب تحويل عمولة'), count: data.affiliates.payout_requests, icon: 'send', tone: 'primary', to: '/dashboard/payout-requests' },
                                data.affiliates && can('affiliates') && { key: 'applicants', label: t('مسوق بانتظار الموافقة'), count: data.affiliates.pending, icon: 'user-plus', tone: 'info', to: '/dashboard/affiliates?status=pending' },
                                data.products && { key: 'out', label: t('منتج نفد مخزونه'), count: data.products.out_of_stock, icon: 'box', tone: 'danger', to: '/dashboard/products?stock=out' },
                                data.products && { key: 'low', label: t('منتج مخزونه منخفض'), count: data.products.low_stock, icon: 'warehouse', tone: 'warning', to: '/dashboard/products?stock=low' },
                            ].filter(Boolean)}
                        />

                        {(data.orders || data.report) && (
                            <div className="mk-stat-group sm:grid-cols-2 xl:grid-cols-4">
                                {data.orders && <StatCard label={t('طلبات اليوم')} value={formatNumber(data.orders.today)} icon="shopping-bag" />}
                                {data.report && (
                                    <>
                                        <StatCard label={t('مبيعات آخر ٣٠ يوماً')} value={formatMoney(data.report.totals.sales)} icon="bar-chart" tone="info" hint={<TrendBadge current={data.report.totals.sales} previous={data.report.previous.sales} />} />
                                        <StatCard label={t('إيرادات محصّلة (٣٠ يوماً)')} value={formatMoney(data.report.totals.revenue)} icon="wallet" tone="success" hint={<TrendBadge current={data.report.totals.revenue} previous={data.report.previous.revenue} />} />
                                        <StatCard label={t('عملاء جدد (٣٠ يوماً)')} value={formatNumber(data.report.totals.new_customers)} icon="users" tone="warning" hint={<TrendBadge current={data.report.totals.new_customers} previous={data.report.previous.new_customers} />} />
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {data.report && <DailyChartCard daily={data.report.daily} title={t('آخر ٣٠ يوماً')} />}

                    {(data.recent || data.report) && (
                        <div className="grid gap-6 lg:grid-cols-5">
                            {data.recent && (
                                <Card
                                    title={t('أحدث الطلبات')}
                                    className={data.report ? 'lg:col-span-3' : 'lg:col-span-5'}
                                    actions={
                                        <Link to="/dashboard/orders" className="text-sm font-medium text-primary hover:underline">
                                            {t('كل الطلبات')}
                                        </Link>
                                    }
                                >
                                    <RecentOrders orders={data.recent} />
                                </Card>
                            )}
                            {data.report && (
                                <div className={data.recent ? 'lg:col-span-2' : 'lg:col-span-5'}>
                                    <TopProductsCard products={data.report.top_products} limit={5} />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
