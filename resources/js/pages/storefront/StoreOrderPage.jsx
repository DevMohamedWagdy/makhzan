import { useEffect, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Alert, EmptyState } from '@/components/ui/Display';
import { Field, Textarea } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';
import { OrderProgress, OrderStatusBadge, PaymentBadge } from '@/features/orders/OrderBadges';
import { formatAddress } from '@/features/storefront/AddressFields';
import { useCustomerAuth } from '@/features/storefront/CustomerAuthContext';
import { ProductImage } from '@/features/storefront/ProductCard';
import { useStorefront } from '@/features/storefront/StorefrontLayout';
import { trackPurchase } from '@/features/storefront/tracking';
import { t } from '@/i18n';
import { PAYMENT_METHODS } from '@/lib/constants';
import { formatDate, formatMoney, formatTime } from '@/lib/format';

/** Banner after coming back from Paymob (?payment=paid|failed|pending). */
const PAYMENT_RESULTS = {
    paid: { tone: 'success', icon: 'check-circle', title: t('تم الدفع بنجاح 🎉'), text: t('وصل دفعك وسيجهز المتجر طلبك.') },
    failed: { tone: 'danger', icon: 'alert-triangle', title: t('لم يكتمل الدفع'), text: t('لم تُخصم أي أموال. يمكنك المحاولة مرة أخرى بنفس الطريقة أو بكارت آخر.') },
    pending: { tone: 'info', icon: 'clock', title: t('جارٍ تأكيد الدفع'), text: t('ننتظر تأكيد Paymob، سيتحدث الطلب خلال لحظات.') },
};

/**
 * One order: confirmation after checkout (?placed=1) or after paying (?payment=…), progress,
 * payment (with "pay now" while an online order is unpaid), items, address and cancel.
 */
export function StoreOrderPage() {
    const { storeSlug, number } = useParams();
    const [searchParams] = useSearchParams();
    const { store } = useStorefront();
    const { isAuthenticated, api } = useCustomerAuth();
    const toast = useToast();
    const [order, setOrder] = useState(null);
    const [error, setError] = useState(null);
    const [cancelOpen, setCancelOpen] = useState(false);
    const [reason, setReason] = useState('');
    const [cancelling, setCancelling] = useState(false);
    const [paying, setPaying] = useState(false);
    const justPlaced = searchParams.get('placed') === '1';
    const paymentResult = PAYMENT_RESULTS[searchParams.get('payment')];

    useEffect(() => {
        if (store) {
            document.title = `${t('طلب #{number}', { number })} | ${store.name}`;
        }
    }, [store, number]);

    useEffect(() => {
        if (!isAuthenticated) {
            return undefined;
        }

        let cancelled = false;

        api.order(number)
            .then((loaded) => !cancelled && setOrder(loaded))
            .catch((loadError) => !cancelled && setError(loadError));

        return () => {
            cancelled = true;
        };
    }, [isAuthenticated, api, number]);

    // The purchase counts for the ad platforms once it's real: placed (cash) or paid (online).
    useEffect(() => {
        if (order && (order.payment_method === 'cod' ? justPlaced : order.payment_status === 'paid')) {
            trackPurchase(order);
        }
    }, [order, justPlaced]);

    // Wallet payments can be confirmed a little after the customer is back: check again shortly.
    useEffect(() => {
        if (order?.payment?.status !== 'pending' || searchParams.get('payment') !== 'pending') {
            return undefined;
        }

        const timer = setTimeout(() => api.order(number).then(setOrder).catch(() => {}), 4000);

        return () => clearTimeout(timer);
    }, [order, searchParams, api, number]);

    if (!isAuthenticated) {
        return <Navigate to={`/${storeSlug}/account/login?next=account/orders/${number}`} replace />;
    }

    if (error) {
        return <EmptyState icon="search" title={t('الطلب غير موجود')} description={error.message} action={<Button variant="secondary" to={`/${storeSlug}/account/orders`}>{t('طلباتي')}</Button>} />;
    }

    if (!order) {
        return (
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-32 w-full rounded-2xl" />
                <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
        );
    }

    const pay = async () => {
        setPaying(true);

        try {
            const url = order.payment.checkout_url ?? (await api.payOrder(order.number)).payment.checkout_url;

            window.location.assign(url);
        } catch (payError) {
            toast.error(t('تعذر فتح صفحة الدفع'), payError.errors?.payment_method ?? payError.message);
            setPaying(false);
        }
    };

    const online = order.payment_method !== 'cod';
    const showResult = paymentResult && online && !(searchParams.get('payment') === 'pending' && order.payment?.status !== 'pending');

    const cancel = async () => {
        setCancelling(true);

        try {
            setOrder(await api.cancelOrder(order.number, reason.trim() || null));
            setCancelOpen(false);
            toast.success(t('تم إلغاء الطلب'));
        } catch (cancelError) {
            toast.error(t('تعذر إلغاء الطلب'), cancelError.errors?.status ?? cancelError.message);
        } finally {
            setCancelling(false);
        }
    };

    return (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
            {justPlaced && (
                <div className="animate-pop flex items-start gap-4 rounded-2xl bg-success-soft p-5 text-success">
                    <Icon name="check-circle" className="size-8 shrink-0" />
                    <div>
                        <p className="text-lg font-bold">{t('تم استلام طلبك بنجاح 🎉')}</p>
                        <p className="mt-1 text-sm text-ink-2">{t('سيتواصل معك المتجر لتأكيد الطلب، وستدفع {total} عند الاستلام.', { total: formatMoney(order.total) })}</p>
                    </div>
                </div>
            )}

            {showResult && (
                <Alert tone={order.payment?.status === 'paid' ? 'success' : paymentResult.tone} icon={paymentResult.icon} title={order.payment?.status === 'paid' ? PAYMENT_RESULTS.paid.title : paymentResult.title}>
                    {order.payment?.status === 'paid' ? PAYMENT_RESULTS.paid.text : paymentResult.text}
                </Alert>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <Link to={`/${storeSlug}/account/orders`} className="text-sm text-muted hover:text-primary">
                        {t('طلباتي')}
                    </Link>
                    <h1 className="mt-1 text-2xl font-bold text-ink">{t('طلب #{number}', { number: order.number })}</h1>
                    <p className="mt-1 text-sm text-muted">{t('بتاريخ {date}', { date: formatDate(order.created_at) })}</p>
                </div>
                <OrderStatusBadge status={order.status} />
            </div>

            {order.payment?.can_pay && (
                <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-warning/40 bg-warning-soft p-5">
                    <div className="min-w-0">
                        <p className="font-semibold text-ink">{t('الطلب بانتظار الدفع')}</p>
                        <p className="mt-1 text-sm text-ink-2">
                            {t('ادفع {total} قبل {time} وإلا يُلغى الطلب تلقائياً.', { total: formatMoney(order.total), time: formatTime(order.payment.expires_at) })}
                        </p>
                        {order.payment.failure_reason && <p className="mt-1 text-xs text-danger">{t('سبب فشل المحاولة السابقة: {reason}', { reason: order.payment.failure_reason })}</p>}
                    </div>
                    <Button icon="credit-card" loading={paying} onClick={pay}>
                        {t('ادفع الآن')}
                    </Button>
                </section>
            )}

            <section className="rounded-2xl border border-line bg-surface p-5">
                <OrderProgress order={order} />
                {order.shipment && (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-2 p-4 text-sm">
                        <span>
                            <span className="block text-muted">{t('مع {carrier} · رقم التتبع', { carrier: order.shipment.carrier })}</span>
                            <span className="ltr block font-mono text-base font-semibold text-ink">{order.shipment.tracking_number}</span>
                            {order.shipment.status && <span className="text-xs text-muted">{order.shipment.status}</span>}
                        </span>
                        {order.shipment.tracking_url && (
                            <a href={order.shipment.tracking_url} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline">
                                {t('تتبع شحنتك')}
                            </a>
                        )}
                    </div>
                )}
            </section>

            <section className="rounded-2xl border border-line bg-surface p-5">
                <h2 className="mb-4 text-base font-semibold text-ink">{t('المنتجات')}</h2>
                <ul className="flex flex-col divide-y divide-line">
                    {order.items.map((item) => (
                        <li key={item.item_id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                            <span className="size-16 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                                <ProductImage src={item.image_url} alt="" />
                            </span>
                            <span className="min-w-0 flex-1 text-sm">
                                <span className="block font-medium text-ink">{item.product_name}</span>
                                {item.variant_title && <span className="block text-muted">{item.variant_title}</span>}
                                <span className="block text-muted">
                                    {item.quantity} × {formatMoney(item.unit_price)}
                                </span>
                            </span>
                            <span className="font-semibold text-ink">{formatMoney(item.line_total)}</span>
                        </li>
                    ))}
                </ul>
                <dl className="mt-4 flex flex-col gap-2 border-t border-line pt-4 text-sm">
                    <div className="flex justify-between">
                        <dt className="text-muted">{t('المنتجات')}</dt>
                        <dd className="text-ink">{formatMoney(order.subtotal)}</dd>
                    </div>
                    <div className="flex justify-between">
                        <dt className="text-muted">{t('الشحن')}</dt>
                        <dd className="text-ink">{order.shipping_fee ? formatMoney(order.shipping_fee) : t('مجاني')}</dd>
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
                    <div className="flex justify-between border-t border-line pt-2 text-base">
                        <dt className="font-semibold text-ink">{online ? t('الإجمالي') : t('الإجمالي (الدفع عند الاستلام)')}</dt>
                        <dd className="font-bold text-ink">{formatMoney(order.total)}</dd>
                    </div>
                    {order.refunded_amount > 0 && (
                        <div className="flex justify-between text-info">
                            <dt>{t('تم استرداده لك')}</dt>
                            <dd>{formatMoney(order.refunded_amount)}</dd>
                        </div>
                    )}
                </dl>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-2 px-4 py-3 text-sm">
                    <span className="text-ink-2">{t('طريقة الدفع: {method}', { method: PAYMENT_METHODS[order.payment_method]?.label ?? order.payment_method })}</span>
                    <PaymentBadge order={order} />
                </div>
            </section>

            <section className="rounded-2xl border border-line bg-surface p-5 text-sm">
                <h2 className="mb-3 text-base font-semibold text-ink">{t('عنوان التوصيل')}</h2>
                <p className="font-medium text-ink">
                    {order.address.recipient_name} <span className="ltr inline-block text-muted">{order.address.phone}</span>
                </p>
                <p className="mt-1 text-ink-2">{formatAddress(order.address)}</p>
                {order.address.landmark && <p className="mt-1 text-muted">{order.address.landmark}</p>}
                {order.customer_note && <p className="mt-3 rounded-xl bg-surface-2 p-3 text-ink-2">{t('ملاحظتك: {note}', { note: order.customer_note })}</p>}
            </section>

            {order.can_cancel && (
                <Button variant="danger-soft" icon="x" className="self-start" onClick={() => setCancelOpen(true)}>
                    {t('إلغاء الطلب')}
                </Button>
            )}

            <ConfirmDialog open={cancelOpen} onClose={() => setCancelOpen(false)} onConfirm={cancel} loading={cancelling} icon="x" title={t('إلغاء الطلب #{number}؟', { number: order.number })} description={t('يمكنك إلغاء الطلب قبل أن يؤكده المتجر.')} confirmLabel={t('إلغاء الطلب')}>
                <Field label={t('سبب الإلغاء')} optional>
                    {(props) => <Textarea {...props} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={200} />}
                </Field>
            </ConfirmDialog>
        </div>
    );
}
