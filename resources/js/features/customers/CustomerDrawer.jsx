import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Avatar, Badge, EmptyState } from '@/components/ui/Display';
import { Pagination } from '@/components/ui/Navigation';
import { Icon } from '@/components/ui/Icon';
import { Drawer } from '@/components/ui/Overlay';
import { Skeleton } from '@/components/ui/Spinner';
import { CustomerPoints } from '@/features/customers/CustomerPoints';
import { OrderStatusBadge } from '@/features/orders/OrderBadges';
import { t } from '@/i18n';
import { formatDate, formatMoney, formatNumber } from '@/lib/format';
import { findCity, findGovernorate } from '@/lib/locations';
import { customersApi } from '@/services/customersApi';
import { ordersApi } from '@/services/ordersApi';

function Stat({ label, value }) {
    return (
        <div className="rounded-xl bg-surface-2 p-3">
            <p className="text-xs text-muted">{label}</p>
            <p className="mt-1 text-base font-bold text-ink">{value}</p>
        </div>
    );
}

/** The customer's orders, ten per page; each opens in the orders page. */
function CustomerOrders({ customerId }) {
    const [page, setPage] = useState(1);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        setError(null);
        ordersApi
            .list({ customer_id: customerId, page, per_page: 10 })
            .then(setResult)
            .catch((loadError) => setError(loadError.message));
    }, [customerId, page]);

    if (error) {
        return <p className="rounded-xl border border-dashed border-line-strong p-5 text-center text-sm text-danger">{error}</p>;
    }

    if (!result) {
        return <Skeleton className="h-32 w-full rounded-xl" />;
    }

    if (result.data.length === 0) {
        return <p className="rounded-xl border border-dashed border-line-strong p-5 text-center text-sm text-muted">{t('لم يطلب هذا العميل بعد.')}</p>;
    }

    return (
        <div className="flex flex-col gap-3">
            <ul className="divide-y divide-line rounded-xl border border-line">
                {result.data.map((order) => (
                    <li key={order.order_id}>
                        <Link to={`/dashboard/orders?order=${order.order_id}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface-2">
                            <span className="min-w-0 flex-1">
                                <span className="block font-semibold text-ink">#{order.number}</span>
                                <span className="text-xs text-muted">
                                    {formatDate(order.created_at)} · {t('{count} منتج', { count: order.items_count })}
                                </span>
                            </span>
                            <span className="flex flex-col items-end gap-1">
                                <span className="text-sm font-semibold text-ink">{formatMoney(order.total)}</span>
                                <OrderStatusBadge status={order.status} />
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>
            {result.meta.last_page > 1 && <Pagination meta={result.meta} onPageChange={setPage} />}
        </div>
    );
}

/** Customer profile: contact, order stats, address book and order history. */
export function CustomerDrawer({ customerId, onClose }) {
    const [customer, setCustomer] = useState(null);
    const [error, setError] = useState(null);

    const load = useCallback(() => {
        setCustomer(null);
        setError(null);
        customersApi
            .get(customerId)
            .then(setCustomer)
            .catch((loadError) => setError(loadError.message));
    }, [customerId]);

    useEffect(() => {
        if (customerId) {
            load();
        }
    }, [customerId, load]);

    const whatsappNumber = customer?.phone?.replace(/^0/, '20');

    return (
        <Drawer open={Boolean(customerId)} onClose={onClose} title={customer?.full_name ?? t('ملف العميل')} description={customer ? t('عميل منذ {value}', { value: formatDate(customer.created_at) }) : undefined} icon="user">
            {error ? (
                <div className="p-6">
                    <EmptyState icon="alert-triangle" title={t('تعذر تحميل العميل')} description={error} action={<Button variant="secondary" icon="refresh" onClick={load}>{t('إعادة المحاولة')}</Button>} />
                </div>
            ) : !customer ? (
                <div className="flex flex-col gap-4 p-6">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-40 w-full" />
                </div>
            ) : (
                <div className="flex flex-col gap-6 p-6">
                    <div className="flex flex-wrap items-center gap-4">
                        <Avatar name={customer.full_name} size="lg" />
                        <div className="min-w-0 flex-1">
                            <p className="ltr text-start font-medium text-ink">{customer.phone}</p>
                            {customer.email && <p className="ltr truncate text-start text-sm text-muted">{customer.email}</p>}
                        </div>
                        <div className="flex gap-2">
                            <a href={`tel:${customer.phone}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-medium text-ink hover:bg-surface-3">
                                <Icon name="phone" className="size-3.5" />
                                {t('اتصال')}
                            </a>
                            <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#25D366] px-3 text-xs font-medium text-white hover:opacity-90">
                                {t('واتساب')}
                            </a>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <Stat label={t('إجمالي الطلبات')} value={formatNumber(customer.stats.orders_count)} />
                        <Stat label={t('طلبات مسلّمة')} value={formatNumber(customer.stats.delivered_orders)} />
                        <Stat label={t('ملغي ومرتجع')} value={formatNumber(customer.stats.failed_orders)} />
                        <Stat label={t('إجمالي المشتريات')} value={formatMoney(customer.stats.total_spent)} />
                        <Stat label={t('متوسط الطلب')} value={formatMoney(customer.stats.average_order)} />
                        <Stat label={t('آخر طلب')} value={customer.last_order_at ? formatDate(customer.last_order_at) : '—'} />
                    </div>

                    <CustomerPoints customerId={customer.customer_id} />

                    <section>
                        <h3 className="mb-3 text-sm font-semibold text-ink">{t('العناوين')}</h3>
                        {customer.addresses.length === 0 ? (
                            <p className="text-sm text-muted">{t('لا توجد عناوين محفوظة.')}</p>
                        ) : (
                            <ul className="flex flex-col gap-2">
                                {customer.addresses.map((address) => (
                                    <li key={address.address_id} className="rounded-xl border border-line p-3 text-sm">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-medium text-ink">{address.recipient_name}</span>
                                            {address.is_default && <Badge tone="primary">{t('الافتراضي')}</Badge>}
                                        </div>
                                        <p className="mt-1 text-ink-2">
                                            {[findGovernorate(address.governorate_id)?.name, findCity(address.governorate_id, address.city_id)?.name, address.address_line].filter(Boolean).join('، ')}
                                        </p>
                                        <p className="ltr mt-0.5 text-start text-xs text-muted">{address.phone}</p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    <section>
                        <h3 className="mb-3 text-sm font-semibold text-ink">{t('سجل الطلبات')}</h3>
                        <CustomerOrders customerId={customer.customer_id} />
                    </section>
                </div>
            )}
        </Drawer>
    );
}
