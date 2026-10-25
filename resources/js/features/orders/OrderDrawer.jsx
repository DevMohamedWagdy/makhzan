import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Alert, Badge, DetailRow } from '@/components/ui/Display';
import { Field, Input, Textarea } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { Drawer, Modal } from '@/components/ui/Overlay';
import { Skeleton } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { refreshDashboardAlerts } from '@/context/DashboardAlertsContext';
import { useToast } from '@/context/ToastContext';
import { formatAddress } from '@/features/storefront/AddressFields';
import { ProductImage } from '@/features/storefront/ProductCard';
import { t } from '@/i18n';
import { CURRENCY, ORDER_STATUSES, PAYMENT_METHODS } from '@/lib/constants';
import { formatDate, formatMoney, formatRelative } from '@/lib/format';
import { openOrderPrint } from '@/pages/orders/OrderPrintPage';
import { ordersApi } from '@/services/ordersApi';
import { OrderProgress, OrderSourceBadge, OrderStatusBadge, PaymentBadge } from './OrderBadges';
import { ShipmentSection } from './ShipmentSection';

const COMMISSION_STATUSES = {
    pending: { label: t('تُستحق عند التوصيل'), tone: 'warning' },
    earned: { label: t('أضيفت لرصيد المسوق'), tone: 'success' },
    cancelled: { label: t('أُلغيت'), tone: 'neutral' },
};

const ACTORS = { customer: t('العميل'), vendor: t('المتجر'), system: t('تلقائي'), admin: t('إدارة المنصة') };

/** Statuses that need a confirmation step (and allow a note). */
const NEEDS_NOTE = ['cancelled', 'returned'];

/**
 * Order details for the vendor: items, payment (with refunds for online payments), customer,
 * address, affiliate commission and the timeline, with buttons for the statuses the order can
 * move to next.
 */
export function OrderDrawer({ orderId, onClose, onChanged }) {
    const toast = useToast();
    const { can } = useAuth();
    const [order, setOrder] = useState(null);
    const [pending, setPending] = useState(null);
    const [confirm, setConfirm] = useState(null);
    const [note, setNote] = useState('');
    const [refundOpen, setRefundOpen] = useState(false);
    const [refund, setRefund] = useState({ amount: '', reason: '' });
    const [refundError, setRefundError] = useState(null);
    const [refunding, setRefunding] = useState(false);

    useEffect(() => {
        setOrder(null);

        if (!orderId) {
            return undefined;
        }

        let cancelled = false;

        ordersApi
            .get(orderId)
            .then((loaded) => !cancelled && setOrder(loaded))
            .catch((error) => {
                toast.error(t('تعذر فتح الطلب'), error.message);
                onClose();
            });

        return () => {
            cancelled = true;
        };
    }, [orderId, toast, onClose]);

    const move = async (status) => {
        setPending(status);

        try {
            const updated = await ordersApi.updateStatus(order.order_id, status, note.trim() || null);

            setOrder(updated);
            setConfirm(null);
            setNote('');
            toast.success(t('تم تحديث الطلب #{number}', { number: updated.number }), ORDER_STATUSES[status].label);
            refreshDashboardAlerts();
            onChanged?.(updated);
        } catch (error) {
            toast.error(t('تعذر تحديث الطلب'), error.errors?.status ?? error.message);
        } finally {
            setPending(null);
        }
    };

    const openRefund = () => {
        setRefund({ amount: String(order.payment.refundable), reason: '' });
        setRefundError(null);
        setRefundOpen(true);
    };

    const submitRefund = async (event) => {
        event.preventDefault();
        setRefunding(true);

        try {
            const updated = await ordersApi.refund(order.order_id, Number(refund.amount), refund.reason.trim() || null);

            setOrder(updated);
            setRefundOpen(false);
            toast.success(t('تم استرداد {amount} للعميل', { amount: formatMoney(Number(refund.amount)) }));
            onChanged?.(updated);
        } catch (error) {
            setRefundError(error.errors?.amount ?? error.message);
        } finally {
            setRefunding(false);
        }
    };

    const whatsapp = order ? `https://wa.me/2${order.address.phone.replace(/^\+?2?/, '')}` : '#';

    return (
        <Drawer open={Boolean(orderId)} onClose={onClose} size="lg" icon="shopping-bag" title={order ? t('طلب #{number}', { number: order.number }) : t('الطلب')} description={order ? formatDate(order.created_at) : undefined}>
            {!order ? (
                <div className="flex flex-col gap-4 p-6">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-40 w-full" />
                </div>
            ) : (
                <div className="flex flex-col divide-y divide-line">
                    <div className="flex flex-col gap-4 p-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <span className="flex flex-wrap items-center gap-2">
                                <OrderStatusBadge status={order.status} />
                                <PaymentBadge order={order} />
                                <OrderSourceBadge source={order.source} />
                            </span>
                            <span className="mk-num text-xl font-semibold text-ink">{formatMoney(order.total)}</span>
                        </div>
                        <OrderProgress order={order} />
                        <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="secondary" icon="file-text" onClick={() => openOrderPrint([order.order_id], 'invoice')}>
                                {t('طباعة الفاتورة')}
                            </Button>
                            <Button size="sm" variant="secondary" icon="box" onClick={() => openOrderPrint([order.order_id], 'packing')}>
                                {t('بوليصة التغليف')}
                            </Button>
                        </div>
                        {order.payment?.status === 'pending' && order.status === 'pending' && (
                            <p className="rounded-xl bg-warning-soft px-4 py-3 text-sm text-ink-2">{t('العميل لم يدفع بعد. يمكنك تأكيد الطلب بعد وصول الدفع، وإلا يُلغى تلقائياً.')}</p>
                        )}
                        {order.payment?.status === 'failed' && order.status === 'pending' && (
                            <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{t('فشلت محاولة الدفع الأخيرة، ويمكن للعميل المحاولة مرة أخرى حتى انتهاء المهلة.')}</p>
                        )}
                        {order.status === 'cancelled' && order.payment?.refundable > 0 && <Alert tone="warning">{t('الطلب ملغي لكن العميل دفع {amount}. رجّع المبلغ له من قسم الدفع بالأسفل.', { amount: formatMoney(order.payment.refundable) })}</Alert>}
                        {order.next_statuses.length > 0 && can('orders.update') && (
                            <div className="flex flex-wrap gap-2">
                                {order.next_statuses.map((status) => (
                                    <Button
                                        key={status}
                                        size="sm"
                                        icon={ORDER_STATUSES[status].icon}
                                        variant={NEEDS_NOTE.includes(status) ? 'danger-soft' : status === 'delivered' ? 'success' : 'primary'}
                                        loading={pending === status}
                                        onClick={() => (NEEDS_NOTE.includes(status) ? setConfirm(status) : move(status))}
                                    >
                                        {ORDER_STATUSES[status].action}
                                    </Button>
                                ))}
                            </div>
                        )}
                    </div>

                    <section className="p-6">
                        <h3 className="mb-3 text-sm font-semibold text-ink">{t('المنتجات')}</h3>
                        <ul className="flex flex-col gap-3">
                            {order.items.map((item) => (
                                <li key={item.item_id} className="flex items-center gap-3">
                                    <span className="size-14 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                                        <ProductImage src={item.image_url} alt="" />
                                    </span>
                                    <span className="min-w-0 flex-1 text-sm">
                                        {item.product_id ? (
                                            <Link to={`/dashboard/products/${item.product_id}`} className="block truncate font-medium text-ink hover:text-primary">
                                                {item.product_name}
                                            </Link>
                                        ) : (
                                            <span className="block truncate font-medium text-ink">{item.product_name}</span>
                                        )}
                                        <span className="block text-muted">
                                            {[item.variant_title, item.sku].filter(Boolean).join(' · ')} {item.quantity} × {formatMoney(item.unit_price)}
                                        </span>
                                    </span>
                                    <span className="text-sm font-semibold text-ink">{formatMoney(item.line_total)}</span>
                                </li>
                            ))}
                        </ul>
                        <dl className="mt-4 flex flex-col gap-1.5 border-t border-line pt-3 text-sm">
                            <div className="flex justify-between">
                                <dt className="text-muted">{t('المنتجات')}</dt>
                                <dd>{formatMoney(order.subtotal)}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-muted">{t('الشحن')}</dt>
                                <dd>{order.shipping_fee ? formatMoney(order.shipping_fee) : t('مجاني')}</dd>
                            </div>
                            {order.discount + order.shipping_discount > 0 && (
                                <div className="flex justify-between text-success">
                                    <dt>{t('خصم الكوبون {code}', { code: order.coupon_code })}</dt>
                                    <dd className="ltr">-{formatMoney(order.discount + order.shipping_discount)}</dd>
                                </div>
                            )}
                            {order.points_discount > 0 && (
                                <div className="flex justify-between text-success">
                                    <dt>{t('خصم النقاط ({count} نقطة)', { count: order.points_redeemed })}</dt>
                                    <dd className="ltr">-{formatMoney(order.points_discount)}</dd>
                                </div>
                            )}
                            <div className="flex justify-between font-semibold text-ink">
                                <dt>{order.payment_method === 'cod' ? t('المطلوب تحصيله عند الاستلام') : t('الإجمالي')}</dt>
                                <dd>{formatMoney(order.total)}</dd>
                            </div>
                        </dl>
                    </section>

                    <ShipmentSection
                        order={order}
                        onUpdated={(updated) => {
                            setOrder(updated);
                            refreshDashboardAlerts();
                            onChanged?.(updated);
                        }}
                    />

                    {order.payment && (
                        <section className="p-6">
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <h3 className="text-sm font-semibold text-ink">{t('الدفع')}</h3>
                                {order.payment.refundable > 0 && can('payments.refund') && (
                                    <Button size="sm" variant="secondary" icon="refresh" onClick={openRefund}>
                                        {t('استرداد مبلغ')}
                                    </Button>
                                )}
                            </div>
                            <dl className="divide-y divide-line">
                                <DetailRow label={t('الطريقة')}>{PAYMENT_METHODS[order.payment_method]?.label}</DetailRow>
                                <DetailRow label={t('الحالة')}>
                                    <PaymentBadge order={order} />
                                </DetailRow>
                                {order.payment.paid_at && <DetailRow label={t('وقت الدفع')}>{formatDate(order.payment.paid_at)}</DetailRow>}
                                {order.payment.transaction_id && (
                                    <DetailRow label={t('رقم العملية في Paymob')} ltr>
                                        {order.payment.transaction_id}
                                    </DetailRow>
                                )}
                                {order.refunded_amount > 0 && <DetailRow label={t('تم استرداده')}>{formatMoney(order.refunded_amount)}</DetailRow>}
                            </dl>
                            {order.payment.refunds?.length > 0 && (
                                <ul className="mt-3 flex flex-col gap-2 text-sm">
                                    {order.payment.refunds.map((item, index) => (
                                        <li key={index} className="flex items-start justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2">
                                            <span>
                                                <span className="block text-ink-2">{item.reason || t('استرداد')}</span>
                                                <span className="text-xs text-muted">{formatRelative(item.created_at)}</span>
                                            </span>
                                            <span className="ltr font-semibold text-ink">-{formatMoney(item.amount)}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    )}

                    {order.fulfillment?.length > 0 && (
                        <section className="p-6">
                            <h3 className="mb-1 text-sm font-semibold text-ink">{t('التجهيز من المخازن')}</h3>
                            <p className="mb-3 text-xs text-muted">{t('من أين تُجهَّز منتجات هذا الطلب، حسب ما خُصم من كل مخزن.')}</p>
                            <ul className="flex flex-col gap-3">
                                {order.fulfillment.map((warehouse) => (
                                    <li key={warehouse.warehouse_id ?? 'deleted'} className="rounded-xl border border-line p-3">
                                        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                                            <Icon name="building" className="size-4 text-muted" />
                                            {warehouse.name}
                                        </p>
                                        <ul className="mt-2 flex flex-col gap-1 text-sm">
                                            {warehouse.items.map((item) => (
                                                <li key={item.variant_id ?? item.product_name} className="flex justify-between gap-3">
                                                    <span className="text-ink-2">{item.variant_title ? `${item.product_name} — ${item.variant_title}` : item.product_name}</span>
                                                    <span className="font-semibold text-ink">× {item.quantity}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    <section className="p-6">
                        <h3 className="mb-3 text-sm font-semibold text-ink">{t('العميل والتوصيل')}</h3>
                        <dl className="divide-y divide-line">
                            <DetailRow label={t('المستلم')}>{order.address.recipient_name}</DetailRow>
                            <DetailRow label={t('الهاتف')}>
                                <span className="inline-flex items-center gap-2">
                                    <span className="ltr">{order.address.phone}</span>
                                    <a href={whatsapp} target="_blank" rel="noreferrer" className="text-xs font-medium text-success hover:underline">
                                        {t('واتساب')}
                                    </a>
                                </span>
                            </DetailRow>
                            <DetailRow label={t('العنوان')}>{formatAddress(order.address)}</DetailRow>
                            {order.address.landmark && <DetailRow label={t('علامة مميزة')}>{order.address.landmark}</DetailRow>}
                            {order.customer && <DetailRow label={t('حساب العميل')}>{`${order.customer.full_name} · ${order.customer.phone}`}</DetailRow>}
                        </dl>
                        {order.customer_note && <p className="mt-3 rounded-xl bg-warning-soft p-3 text-sm text-ink-2">{(order.source === 'store' ? t('ملاحظة العميل: {note}', { note: order.customer_note }) : t('ملاحظات: {note}', { note: order.customer_note }))}</p>}
                    </section>

                    {order.affiliate && (
                        <section className="p-6">
                            <h3 className="mb-3 text-sm font-semibold text-ink">{t('المسوق والعمولة')}</h3>
                            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-4 text-sm">
                                <div>
                                    <Link to={`/dashboard/affiliates?affiliate=${order.affiliate.affiliate_id}`} className="font-semibold text-ink hover:text-primary">
                                        {order.affiliate.full_name}
                                    </Link>
                                    <p className="text-muted">
                                        {t('كود {code}', { code: order.referral_code })} · {order.commission.type === 'percentage' ? `${order.commission.rate}%` : formatMoney(order.commission.rate)}
                                    </p>
                                </div>
                                <div className="text-end">
                                    <p className="font-bold text-ink">{formatMoney(order.commission.amount)}</p>
                                    <Badge tone={COMMISSION_STATUSES[order.commission.status]?.tone ?? 'neutral'}>{COMMISSION_STATUSES[order.commission.status]?.label}</Badge>
                                </div>
                            </div>
                        </section>
                    )}

                    <section className="p-6">
                        <h3 className="mb-3 text-sm font-semibold text-ink">{t('سجل الطلب')}</h3>
                        <ol className="flex flex-col gap-3">
                            {order.events.map((event, index) => (
                                <li key={index} className="flex items-start gap-3 text-sm">
                                    <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-surface-3 text-ink-2">
                                        <Icon name={ORDER_STATUSES[event.status].icon} className="size-3.5" />
                                    </span>
                                    <span>
                                        <span className="block font-medium text-ink">
                                            {ORDER_STATUSES[event.status].label} <span className="font-normal text-muted">· {ACTORS[event.actor] ?? event.actor}</span>
                                        </span>
                                        <span className="block text-xs text-muted">{formatRelative(event.created_at)}</span>
                                        {event.note && <span className="mt-1 block text-ink-2">{event.note}</span>}
                                    </span>
                                </li>
                            ))}
                        </ol>
                    </section>
                </div>
            )}

            <ConfirmDialog
                open={Boolean(confirm)}
                onClose={() => setConfirm(null)}
                onConfirm={() => move(confirm)}
                loading={Boolean(pending)}
                icon={confirm ? ORDER_STATUSES[confirm].icon : 'x'}
                title={confirm === 'cancelled' ? t('إلغاء الطلب #{number}؟', { number: order?.number ?? '' }) : t('تسجيل الطلب #{number} كمرتجع؟', { number: order?.number ?? '' })}
                description={confirm === 'returned' && order?.commission.status === 'earned' ? t('ستعود المنتجات للمخزون، وتُخصم عمولة المسوق من رصيده.') : t('ستعود المنتجات للمخزون.')}
                confirmLabel={confirm ? ORDER_STATUSES[confirm].action : ''}
            >
                <Field label={confirm === 'cancelled' ? t('سبب الإلغاء') : t('سبب الإرجاع')} optional>
                    {(props) => <Textarea {...props} value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} />}
                </Field>
            </ConfirmDialog>
            <Modal
                open={refundOpen}
                onClose={() => setRefundOpen(false)}
                icon="refresh"
                title={t('استرداد مبلغ للعميل')}
                description={order?.payment ? t('يُرجَع المبلغ لنفس الكارت أو المحفظة عبر Paymob. أقصى مبلغ {amount}.', { amount: formatMoney(order.payment.refundable) }) : undefined}
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setRefundOpen(false)}>
                            {t('إلغاء')}
                        </Button>
                        <Button type="submit" form="refund-form" icon="refresh" loading={refunding} disabled={!(Number(refund.amount) > 0)}>
                            {t('استرداد')}
                        </Button>
                    </>
                }
            >
                <form id="refund-form" onSubmit={submitRefund} noValidate className="flex flex-col gap-4">
                    <Field label={t('المبلغ')} required error={refundError}>
                        {(props) => (
                            <Input
                                {...props}
                                type="number"
                                inputMode="decimal"
                                min={0}
                                max={order?.payment?.refundable}
                                step="0.01"
                                value={refund.amount}
                                onChange={(event) => setRefund({ ...refund, amount: event.target.value })}
                                suffix={<span className="px-2 text-sm text-muted">{CURRENCY}</span>}
                            />
                        )}
                    </Field>
                    <Field label={t('السبب')} optional>
                        {(props) => <Textarea {...props} value={refund.reason} onChange={(event) => setRefund({ ...refund, reason: event.target.value })} maxLength={200} placeholder={t('مثال: قطعة تالفة')} />}
                    </Field>
                    {order?.affiliate && ['pending', 'earned'].includes(order.commission.status) && <Alert tone="info">{t('ستقل عمولة المسوق بنسبة المبلغ المسترد من المنتجات.')}</Alert>}
                </form>
            </Modal>
        </Drawer>
    );
}
