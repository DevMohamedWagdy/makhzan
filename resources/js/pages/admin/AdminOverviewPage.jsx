import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { ColumnChart } from '@/components/ui/Charts';
import { Card, EmptyState, StatCard } from '@/components/ui/Display';
import { Skeleton } from '@/components/ui/Spinner';
import { AdminAffiliateDrawer } from '@/features/admin/AdminPeople';
import { parseDate } from '@/features/reports/ReportWidgets';
import { intlLocale, t } from '@/i18n';
import { formatMoney, formatNumber } from '@/lib/format';
import { adminApi } from '@/services/adminApi';

const dayLabel = new Intl.DateTimeFormat(intlLocale, { day: 'numeric', month: 'short' });

/** A titled group of stat cards. */
function StatSection({ title, children }) {
    return (
        <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-ink-2">{title}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">{children}</div>
        </section>
    );
}

/** Daily counts for the last 30 days. */
function DailyChart({ title, daily, field }) {
    return (
        <Card title={title} description={t('آخر ٣٠ يوماً')}>
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
                        <thead className="border-b border-line bg-surface-2 text-xs text-muted">
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
                                    <td className="px-4 py-3 text-muted">{formatNumber(index + 1)}</td>
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

/** The admin home: stores, orders, affiliates and products, daily charts and the top performers. */
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
            <PageHeader title={t('الرئيسية')} description={t('ملخص أداء المنصة')} />

            {error ? (
                <EmptyState icon="alert-triangle" title={t('تعذر تحميل البيانات')} description={error} action={<Button variant="secondary" icon="refresh" onClick={load}>{t('إعادة المحاولة')}</Button>} />
            ) : !data ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
                    {Array.from({ length: 10 }, (_, index) => (
                        <Skeleton key={index} className="h-24 rounded-xl" />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col gap-8">
                    <StatSection title={t('المتاجر')}>
                        <StatCard label={t('إجمالي المتاجر')} value={formatNumber(data.stores.total)} icon="store" />
                        <StatCard label={t('المتاجر النشطة')} value={formatNumber(data.stores.active)} icon="check" tone="success" />
                        <StatCard label={t('المتاجر الموقوفة')} value={formatNumber(data.stores.suspended)} icon="lock" tone="danger" />
                    </StatSection>

                    <StatSection title={t('الطلبات')}>
                        <StatCard label={t('إجمالي الطلبات')} value={formatNumber(data.orders.total)} icon="shopping-bag" />
                        <StatCard label={t('الطلبات المكتملة')} value={formatNumber(data.orders.delivered)} icon="check" tone="success" />
                        <StatCard label={t('الطلبات الملغية')} value={formatNumber(data.orders.cancelled)} icon="x" tone="danger" />
                        <StatCard label={t('الطلبات المرتجعة')} value={formatNumber(data.orders.returned)} icon="refresh" tone="warning" />
                        <StatCard label={t('إجمالي المبيعات المؤكدة')} value={formatMoney(data.orders.delivered_sales)} icon="bar-chart" tone="info" />
                    </StatSection>

                    <StatSection title={t('المسوقين')}>
                        <StatCard label={t('إجمالي المسوقين')} value={formatNumber(data.affiliates.total)} icon="users" />
                        <StatCard label={t('المسوقين النشطين')} value={formatNumber(data.affiliates.active)} icon="check" tone="success" />
                        <StatCard label={t('المسوقين المجمدين')} value={formatNumber(data.affiliates.frozen)} icon="lock" tone="danger" />
                        <StatCard label={t('المسوقين في الانتظار')} value={formatNumber(data.affiliates.pending)} icon="clock" tone="warning" />
                        <StatCard label={t('إجمالي العمولات المؤكدة')} value={formatMoney(data.affiliates.earned_commission)} icon="bar-chart" tone="info" />
                    </StatSection>

                    <StatSection title={t('المنتجات')}>
                        <StatCard label={t('إجمالي المنتجات')} value={formatNumber(data.products.total)} icon="box" />
                        <StatCard label={t('المنتجات المنشورة')} value={formatNumber(data.products.published)} icon="check" tone="success" />
                    </StatSection>

                    <div className="grid gap-6 xl:grid-cols-2">
                        <DailyChart title={t('المتاجر المسجلة يومياً')} daily={data.daily} field="stores" />
                        <DailyChart title={t('الطلبات المسجلة يومياً')} daily={data.daily} field="orders" />
                    </div>

                    <div className="grid gap-6 xl:grid-cols-2">
                        <TopTable
                            title={t('أعلى ٥ متاجر مبيعاً')}
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
                            title={t('أعلى ٥ مسوقين مبيعاً')}
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
