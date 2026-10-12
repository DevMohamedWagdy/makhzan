import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Badge, DetailRow } from '@/components/ui/Display';
import { Field, Textarea } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { Drawer } from '@/components/ui/Overlay';
import { Skeleton } from '@/components/ui/Spinner';
import { refreshDashboardAlerts } from '@/context/DashboardAlertsContext';
import { useToast } from '@/context/ToastContext';
import { formatAddress } from '@/features/storefront/AddressFields';
import { ProductImage } from '@/features/storefront/ProductCard';
import { t } from '@/i18n';
import { ORDER_STATUSES } from '@/lib/constants';
import { formatDate, formatMoney, formatRelative } from '@/lib/format';
import { ordersApi } from '@/services/ordersApi';
import { OrderProgress, OrderStatusBadge } from './OrderBadges';

const COMMISSION_STATUSES = {
    pending: { label: t('تُستحق عند التوصيل'), tone: 'warning' },
    earned: { label: t('أضيفت لرصيد المسوق'), tone: 'success' },
    cancelled: { label: t('أُلغيت'), tone: 'neutral' },
};

const ACTORS = { customer: t('العميل'), vendor: t('المتجر') };

/** Statuses that need a confirmation step (and allow a note). */
const NEEDS_NOTE = ['cancelled', 'returned'];

/**
 * Order details for the vendor: items, customer, address, affiliate commission and the
 * timeline, with buttons for the statuses the order can move to next.
 */
export function OrderDrawer({ orderId, onClose, onChanged }) {
    const toast = useToast();
    const [order, setOrder] = useState(null);
    const [pending, setPending] = useState(null);
    const [confirm, setConfirm] = useState(null);
    const [note, setNote] = useState('');

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
                            <OrderStatusBadge status={order.status} />
                            <span className="text-xl font-bold text-ink">{formatMoney(order.total)}</span>
                        </div>
                        <OrderProgress order={order} />
                        {order.next_statuses.length > 0 && (
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
                            <div className="flex justify-between font-semibold text-ink">
                                <dt>{t('المطلوب تحصيله عند الاستلام')}</dt>
                                <dd>{formatMoney(order.total)}</dd>
                            </div>
                        </dl>
                    </section>

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
                        {order.customer_note && <p className="mt-3 rounded-xl bg-warning-soft p-3 text-sm text-ink-2">{t('ملاحظة العميل: {note}', { note: order.customer_note })}</p>}
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
        </Drawer>
    );
}
