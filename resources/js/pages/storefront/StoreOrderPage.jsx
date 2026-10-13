import { useEffect, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/Display';
import { Field, Textarea } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';
import { OrderProgress, OrderStatusBadge } from '@/features/orders/OrderBadges';
import { formatAddress } from '@/features/storefront/AddressFields';
import { useCustomerAuth } from '@/features/storefront/CustomerAuthContext';
import { ProductImage } from '@/features/storefront/ProductCard';
import { useStorefront } from '@/features/storefront/StorefrontLayout';
import { t } from '@/i18n';
import { formatDate, formatMoney } from '@/lib/format';

/** One order: confirmation after checkout (?placed=1), progress, items, address and cancel. */
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
    const justPlaced = searchParams.get('placed') === '1';

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

            <section className="rounded-2xl border border-line bg-surface p-5">
                <OrderProgress order={order} />
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
                    <div className="flex justify-between border-t border-line pt-2 text-base">
                        <dt className="font-semibold text-ink">{t('الإجمالي (الدفع عند الاستلام)')}</dt>
                        <dd className="font-bold text-ink">{formatMoney(order.total)}</dd>
                    </div>
                </dl>
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
