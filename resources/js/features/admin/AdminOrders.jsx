import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DetailRow, EmptyState } from '@/components/ui/Display';
import { Field, Input, Select, Textarea } from '@/components/ui/Form';
import { Pagination } from '@/components/ui/Navigation';
import { Drawer } from '@/components/ui/Overlay';
import { Skeleton } from '@/components/ui/Spinner';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useToast } from '@/context/ToastContext';
import { OrderStatusBadge, PaymentBadge } from '@/features/orders/OrderBadges';
import { formatAddress } from '@/features/storefront/AddressFields';
import { useDebouncedValue } from '@/hooks/common';
import { t } from '@/i18n';
import { ORDER_STATUSES, PAYMENT_METHODS } from '@/lib/constants';
import { formatDate, formatMoney, formatRelative } from '@/lib/format';
import { findGovernorate } from '@/lib/locations';
import { adminApi } from '@/services/adminApi';

const ORDER_ACTORS = { customer: t('العميل'), vendor: t('المتجر'), system: t('تلقائي'), admin: t('الإدارة') };

const STATUS_OPTIONS = [{ value: '', label: t('كل الحالات') }, ...Object.entries(ORDER_STATUSES).map(([value, config]) => ({ value, label: config.label }))];

/** Orders across the platform (or one store with `storeId`), with search, status and dates. */
export function AdminOrdersTable({ storeId = null }) {
    const [filters, setFilters] = useState({ status: '', from: '', to: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const search = useDebouncedValue(searchTerm, 300);
    const [page, setPage] = useState(1);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [openOrderId, setOpenOrderId] = useState(null);

    const load = useCallback(() => {
        setError(null);
        adminApi
            .orders({ ...filters, search, page, store_id: storeId })
            .then(setResult)
            .catch((loadError) => setError(loadError.message));
    }, [filters, search, page, storeId]);

    useEffect(load, [load]);

    const setFilter = (key, value) => {
        setFilters((current) => ({ ...current, [key]: value }));
        setPage(1);
    };

    return (
        <>
            <div className="flex flex-wrap items-center gap-3 p-4">
                <Input type="search" icon="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder={t('رقم الطلب أو اسم العميل أو هاتفه...')} aria-label={t('بحث في الطلبات')} className="lg:w-80" />
                <Select value={filters.status} onChange={(event) => setFilter('status', event.target.value)} aria-label={t('الحالة')} className="sm:w-44" options={STATUS_OPTIONS} />
                <Input type="date" value={filters.from} onChange={(event) => setFilter('from', event.target.value)} aria-label={t('من تاريخ')} className="sm:w-40" />
                <Input type="date" value={filters.to} onChange={(event) => setFilter('to', event.target.value)} aria-label={t('إلى تاريخ')} className="sm:w-40" />
            </div>

            {error ? (
                <div className="p-6">
                    <EmptyState icon="alert-triangle" title={t('تعذر تحميل الطلبات')} description={error} action={<Button variant="secondary" icon="refresh" onClick={load}>{t('إعادة المحاولة')}</Button>} />
                </div>
            ) : !result ? (
                <div className="flex flex-col gap-2 p-4">
                    {[0, 1, 2, 3].map((index) => (
                        <Skeleton key={index} className="h-12 w-full" />
                    ))}
                </div>
            ) : result.data.length === 0 ? (
                <div className="p-6">
                    <EmptyState icon="shopping-bag" title={t('لا توجد طلبات مطابقة')} />
                </div>
            ) : (
                <div className="mk-scroll overflow-x-auto">
                    <table className="w-full min-w-[860px] text-sm">
                        <thead className="mk-thead">
                            <tr>
                                {[t('الطلب'), !storeId && t('المتجر'), t('العميل'), t('المحافظة'), t('الإجمالي'), t('الدفع'), t('الحالة')].filter(Boolean).map((column) => (
                                    <th key={column} scope="col" className="px-4 py-3 text-start font-medium whitespace-nowrap">
                                        {column}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                            {result.data.map((order) => (
                                <tr key={order.order_id} className="cursor-pointer transition hover:bg-surface-2" onClick={() => setOpenOrderId(order.order_id)}>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <span className="block font-semibold text-ink">#{order.number}</span>
                                        <span className="text-xs text-muted">{formatRelative(order.created_at)}</span>
                                    </td>
                                    {!storeId && <td className="px-4 py-3 text-ink-2">{order.store?.name}</td>}
                                    <td className="px-4 py-3">
                                        <span className="block font-medium text-ink">{order.recipient_name}</span>
                                        <span className="ltr block text-start text-xs text-muted">{order.phone}</span>
                                    </td>
                                    <td className="px-4 py-3 text-ink-2">{findGovernorate(order.governorate_id)?.name}</td>
                                    <td className="px-4 py-3 font-semibold text-ink">{formatMoney(order.total)}</td>
                                    <td className="px-4 py-3">
                                        <PaymentBadge order={order} />
                                    </td>
                                    <td className="px-4 py-3">
                                        <OrderStatusBadge status={order.status} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {result && result.meta.total > result.meta.per_page && (
                <div className="border-t border-line px-4 py-3">
                    <Pagination meta={result.meta} onPageChange={setPage} />
                </div>
            )}

            <AdminOrderDrawer orderId={openOrderId} onClose={() => setOpenOrderId(null)} onChanged={load} />
        </>
    );
}

/** Any order on the platform; admins with orders.update can move it to its next status. */
export function AdminOrderDrawer({ orderId, onClose, onChanged }) {
    const toast = useToast();
    const { can } = useAdminAuth();
    const [order, setOrder] = useState(null);
    const [pending, setPending] = useState(null);
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);

    const changeStatus = async (status, statusNote = null) => {
        setBusy(true);

        try {
            setOrder(await adminApi.updateOrderStatus(order.order_id, { status, note: statusNote }));
            setPending(null);
            toast.success(t('تم تحديث حالة الطلب'), ORDER_STATUSES[status]?.label);
            onChanged?.();
        } catch (error) {
            toast.error(t('تعذر تحديث الحالة'), error.errors?.status ?? error.message);
        } finally {
            setBusy(false);
        }
    };

    useEffect(() => {
        setOrder(null);

        if (orderId) {
            adminApi
                .order(orderId)
                .then(setOrder)
                .catch((error) => {
                    toast.error(t('تعذر فتح الطلب'), error.message);
                    onClose();
                });
        }
    }, [orderId, toast, onClose]);

    return (
        <Drawer open={Boolean(orderId)} onClose={onClose} size="lg" icon="shopping-bag" title={order ? t('طلب #{number}', { number: order.number }) : t('الطلب')} description={order ? formatDate(order.created_at) : undefined}>
            {!order ? (
                <div className="flex flex-col gap-4 p-6">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-40 w-full" />
                </div>
            ) : (
                <div className="flex flex-col divide-y divide-line">
                    <div className="flex flex-wrap items-center gap-2 p-6">
                        <OrderStatusBadge status={order.status} />
                        <PaymentBadge order={order} />
                        <span className="ms-auto mk-num text-xl font-semibold text-ink">{formatMoney(order.total)}</span>
                    </div>
                    {order.next_statuses?.length > 0 && can('orders.update') && (
                        <div className="flex flex-wrap gap-2 p-6">
                            {order.next_statuses.map((status) => (
                                <Button
                                    key={status}
                                    size="sm"
                                    variant={['cancelled', 'returned'].includes(status) ? 'danger-soft' : 'soft'}
                                    icon={ORDER_STATUSES[status]?.icon}
                                    disabled={busy}
                                    onClick={() => {
                                        setNote('');
                                        setPending(status);
                                    }}
                                >
                                    {ORDER_STATUSES[status]?.action ?? ORDER_STATUSES[status]?.label}
                                </Button>
                            ))}
                        </div>
                    )}
                    <section className="p-6">
                        <h3 className="mb-3 text-sm font-semibold text-ink">{t('المنتجات')}</h3>
                        <ul className="flex flex-col divide-y divide-line text-sm">
                            {order.items.map((item) => (
                                <li key={item.item_id} className="flex justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                                    <span className="text-ink">
                                        {item.product_name}
                                        {item.variant_title && <span className="text-muted"> · {item.variant_title}</span>} × {item.quantity}
                                    </span>
                                    <span className="font-semibold text-ink">{formatMoney(item.line_total)}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                    <dl className="flex flex-col p-6">
                        <DetailRow label={t('العميل')}>{order.address.recipient_name}</DetailRow>
                        <DetailRow label={t('الهاتف')} ltr>
                            {order.address.phone}
                        </DetailRow>
                        <DetailRow label={t('العنوان')}>{formatAddress(order.address)}</DetailRow>
                        <DetailRow label={t('طريقة الدفع')}>{PAYMENT_METHODS[order.payment_method]?.label ?? '—'}</DetailRow>
                        {order.shipment && (
                            <DetailRow label={t('الشحن')}>
                                {order.shipment.carrier} · <span className="ltr font-mono">{order.shipment.tracking_number}</span>
                            </DetailRow>
                        )}
                        {order.affiliate && <DetailRow label={t('المسوق')}>{order.affiliate.full_name}</DetailRow>}
                        {order.coupon_code && <DetailRow label={t('الكوبون')}>{order.coupon_code}</DetailRow>}
                    </dl>
                    {order.events?.length > 0 && (
                        <section className="p-6">
                            <h3 className="mb-3 text-sm font-semibold text-ink">{t('سجل الطلب')}</h3>
                            <ol className="flex flex-col gap-2 text-sm">
                                {order.events.map((event, index) => (
                                    <li key={index} className="flex justify-between gap-3">
                                        <span className="text-ink">
                                            {ORDER_STATUSES[event.status]?.label ?? event.status}
                                            {ORDER_ACTORS[event.actor] && <span className="text-muted"> · {ORDER_ACTORS[event.actor]}</span>}
                                            {event.note && <span className="text-muted"> · {event.note}</span>}
                                        </span>
                                        <span className="text-xs text-muted">{formatDate(event.created_at)}</span>
                                    </li>
                                ))}
                            </ol>
                        </section>
                    )}
                </div>
            )}
            <ConfirmDialog
                open={Boolean(pending)}
                onClose={() => setPending(null)}
                onConfirm={() => changeStatus(pending, note.trim() || null)}
                loading={busy}
                tone={['cancelled', 'returned'].includes(pending) ? 'danger' : 'primary'}
                icon={ORDER_STATUSES[pending]?.icon ?? 'check'}
                title={t('تغيير حالة الطلب إلى «{status}»؟', { status: ORDER_STATUSES[pending]?.label ?? '' })}
                description={t('ستُسجَّل في سجل الطلب كإجراء من إدارة المنصة، ويصل العميل إشعار بالتغيير.')}
                confirmLabel={t('تأكيد')}
            >
                <Field label={t('ملاحظة')} optional>
                    {(props) => <Textarea {...props} value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} rows={2} />}
                </Field>
            </ConfirmDialog>
        </Drawer>
    );
}
