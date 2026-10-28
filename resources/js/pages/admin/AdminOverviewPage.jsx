import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ColumnChart } from '@/components/ui/Charts';
import { Card, EmptyState, StatCard, StatStrip, WelcomeBanner } from '@/components/ui/Display';
import { Skeleton } from '@/components/ui/Spinner';
import { AdminAffiliateDrawer } from '@/features/admin/AdminPeople';
import { parseDate } from '@/features/reports/ReportWidgets';
import { intlLocale, t } from '@/i18n';
import { cn, formatMoney, formatNumber } from '@/lib/format';
import { adminApi } from '@/services/adminApi';

const dayLabel = new Intl.DateTimeFormat(intlLocale, { day: 'numeric', month: 'short' });

const BREAKDOWN_DOTS = { success: 'bg-success', danger: 'bg-danger', warning: 'bg-warning', info: 'bg-info', neutral: 'bg-muted' };

/**
 * One area's figures as a compact list (a dot, the label, the figure), with its total in the header.
 *
 * @param {{ title: string, icon: string, total: string, to: string, rows: Array<{ label: string, value: string, tone: keyof typeof BREAKDOWN_DOTS }> }} props
 */
function Breakdown({ title, icon, total, to, rows }) {
    return (
        <Link to={to} className="mk-card mk-card-link group flex flex-col p-5">
            <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-lg bg-primary-soft text-brand-accent">
                    <Icon name={icon} className="size-[18px]" />
                </span>
                <span className="flex-1 text-sm font-semibold text-ink">{title}</span>
                <Icon name="chevron-left" className="size-4 text-muted transition group-hover:text-ink" />
            </div>
            <p className="mk-num mt-4 text-2xl font-semibold tracking-tight text-ink">{total}</p>
            <ul className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
                {rows.map((row) => (
                    <li key={row.label} className="flex items-center gap-2 text-sm">
                        <span className={cn('size-2 rounded-full', BREAKDOWN_DOTS[row.tone])} />
                        <span className="flex-1 text-muted">{row.label}</span>
                        <span className="mk-num font-medium text-ink">{row.value}</span>
                    </li>
                ))}
            </ul>
        </Link>
    );
}

/** Daily counts for the last 30 days. */
function DailyChart({ title, daily, field }) {
    return (
        <Card title={title} description={t('آخر 30 يوماً')}>
            <ColumnChart caption={title} data={daily.map((day) => ({ key: day.date, label: dayLabel.format(parseDate(day.date)), value: day[field] }))} />
        </Card>
    );
}

/**
 * A ranked top-5 table.
 *
 * @param {{ title: string, rows: Array<object>, columns: Array<{ label: string, render: (row: object) => any, className?: string }>, rowKey: (row: object) => any, emptyText: string, actions?: any }} props
 */
function TopTable({ title, rows, columns, rowKey, emptyText, actions }) {
    return (
        <Card title={title} actions={actions} bodyClassName="p-0">
            {rows.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-muted">{emptyText}</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="mk-thead">
                            <tr>
                                <th scope="col" className="w-10 px-4 py-3 text-start font-medium">#</th>
                                {columns.map((column) => (
                                    <th key={column.label} scope="col" className={`px-4 py-3 text-start font-medium whitespace-nowrap ${column.className ?? ''}`}>
                                        {column.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                            {rows.map((row, index) => (
                                <tr key={rowKey(row)}>
                                    <td className="px-4 py-3 text-xs text-muted">{formatNumber(index + 1)}</td>
                                    {columns.map((column) => (
                                        <td key={column.label} className={`px-4 py-3 ${column.className ?? ''}`}>
                                            {column.render(row)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Card>
    );
}

/** The admin home: the headline figures, daily charts, each area's breakdown and the top performers. */
export function AdminOverviewPage() {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [openAffiliateId, setOpenAffiliateId] = useState(null);

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
            <WelcomeBanner title={t('لوحة المنصة')} description={t('أداء المتاجر والطلبات والمسوقين على Sellygrow')} />

            {error ? (
                <EmptyState icon="alert-triangle" title={t('تعذر تحميل البيانات')} description={error} action={<Button variant="secondary" icon="refresh" onClick={load}>{t('إعادة المحاولة')}</Button>} />
            ) : !data ? (
                <div className="flex flex-col gap-6">
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {[0, 1, 2, 3].map((index) => (
                            <Skeleton key={index} className="h-28 rounded-2xl" />
                        ))}
                    </div>
                    <Skeleton className="h-72 rounded-2xl" />
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    <StatStrip className="mb-0">
                        <StatCard label={t('إجمالي المبيعات المؤكدة')} value={formatMoney(data.orders.delivered_sales)} icon="bar-chart" />
                        <StatCard label={t('إجمالي الطلبات')} value={formatNumber(data.orders.total)} icon="shopping-bag" tone="info" />
                        <StatCard label={t('المتاجر النشطة')} value={formatNumber(data.stores.active)} icon="store" tone="success" hint={t('من {total} متجر', { total: formatNumber(data.stores.total) })} />
                        <StatCard label={t('إجمالي العمولات المؤكدة')} value={formatMoney(data.affiliates.earned_commission)} icon="wallet" tone="warning" />
                    </StatStrip>

                    <div className="grid gap-6 lg:grid-cols-2">
                        <DailyChart title={t('المتاجر المسجلة يومياً')} daily={data.daily} field="stores" />
                        <DailyChart title={t('الطلبات المسجلة يومياً')} daily={data.daily} field="orders" />
                    </div>

                    <section className="flex flex-col gap-3">
                        <h2 className="mk-overline px-1">{t('حالة المنصة')}</h2>
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <Breakdown
                                title={t('الطلبات')}
                                icon="shopping-bag"
                                to="/admin/orders"
                                total={formatNumber(data.orders.total)}
                                rows={[
                                    { label: t('مكتملة'), value: formatNumber(data.orders.delivered), tone: 'success' },
                                    { label: t('ملغية'), value: formatNumber(data.orders.cancelled), tone: 'danger' },
                                    { label: t('مرتجعة'), value: formatNumber(data.orders.returned), tone: 'warning' },
                                ]}
                            />
                            <Breakdown
                                title={t('المسوقين')}
                                icon="users"
                                to="/admin/affiliates"
                                total={formatNumber(data.affiliates.total)}
                                rows={[
                                    { label: t('نشطون'), value: formatNumber(data.affiliates.active), tone: 'success' },
                                    { label: t('في الانتظار'), value: formatNumber(data.affiliates.pending), tone: 'warning' },
                                    { label: t('مجمدون'), value: formatNumber(data.affiliates.frozen), tone: 'danger' },
                                ]}
                            />
                            <Breakdown
                                title={t('المتاجر')}
                                icon="store"
                                to="/admin/stores"
                                total={formatNumber(data.stores.total)}
                                rows={[
                                    { label: t('نشطة'), value: formatNumber(data.stores.active), tone: 'success' },
                                    { label: t('موقوفة'), value: formatNumber(data.stores.suspended), tone: 'danger' },
                                ]}
                            />
                            <Breakdown
                                title={t('المنتجات')}
                                icon="box"
                                to="/admin/products"
                                total={formatNumber(data.products.total)}
                                rows={[
                                    { label: t('منشورة'), value: formatNumber(data.products.published), tone: 'success' },
                                    { label: t('غير منشورة'), value: formatNumber(data.products.total - data.products.published), tone: 'neutral' },
                                ]}
                            />
                        </div>
                    </section>

                    <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
                        <TopTable
                            title={t('أعلى 5 متاجر مبيعاً')}
                            rows={data.top_stores}
                            rowKey={(store) => store.store_id}
                            emptyText={t('لا توجد مبيعات بعد.')}
                            actions={<Link to="/admin/stores" className="text-sm font-medium text-primary hover:underline">{t('الكل')}</Link>}
                            columns={[
                                { label: t('المتجر'), render: (store) => <Link to={`/admin/stores/${store.store_id}`} className="font-medium text-ink hover:text-primary">{store.name}</Link> },
                                { label: t('طلبات مسلّمة'), render: (store) => formatNumber(store.delivered_orders) },
                                { label: t('المبيعات المؤكدة'), render: (store) => formatMoney(store.delivered_sales), className: 'font-semibold text-ink whitespace-nowrap' },
                            ]}
                        />
                        <TopTable
                            title={t('أعلى 5 مسوقين مبيعاً')}
                            rows={data.top_affiliates}
                            rowKey={(affiliate) => affiliate.affiliate_id}
                            emptyText={t('لا توجد عمولات بعد.')}
                            actions={<Link to="/admin/affiliates" className="text-sm font-medium text-primary hover:underline">{t('الكل')}</Link>}
                            columns={[
                                {
                                    label: t('المسوق'),
                                    render: (affiliate) => (
                                        <span>
                                            <button type="button" onClick={() => setOpenAffiliateId(affiliate.affiliate_id)} className="block text-start font-medium text-ink hover:text-primary">
                                                {affiliate.name}
                                            </button>
                                            {affiliate.store && (
                                                <Link to={`/admin/stores/${affiliate.store.store_id}`} className="text-xs text-muted hover:text-primary">
                                                    {affiliate.store.name}
                                                </Link>
                                            )}
                                        </span>
                                    ),
                                },
                                { label: t('طلبات مسلّمة'), render: (affiliate) => formatNumber(affiliate.delivered_orders) },
                                { label: t('العمولات المؤكدة'), render: (affiliate) => formatMoney(affiliate.earned_commission), className: 'font-semibold text-ink whitespace-nowrap' },
                            ]}
                        />
                    </div>
                </div>
            )}

            <AdminAffiliateDrawer affiliateId={openAffiliateId} onClose={() => setOpenAffiliateId(null)} onChanged={load} />
        </>
    );
}
