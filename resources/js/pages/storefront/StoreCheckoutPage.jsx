import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Alert, EmptyState } from '@/components/ui/Display';
import { Checkbox, Field, Textarea } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';
import { AddressFields, EMPTY_ADDRESS, formatAddress } from '@/features/storefront/AddressFields';
import { CouponBox } from '@/features/storefront/CouponBox';
import { clearSavedCoupon, getSavedCoupon } from '@/features/storefront/couponLink';
import { useCart } from '@/features/storefront/CartContext';
import { useCustomerAuth } from '@/features/storefront/CustomerAuthContext';
import { ProductImage } from '@/features/storefront/ProductCard';
import { getReferralCode } from '@/features/storefront/referral';
import { useStorefront } from '@/features/storefront/StorefrontLayout';
import { t } from '@/i18n';
import { cn, formatMoney } from '@/lib/format';
import { storefrontApi } from '@/services/storefrontApi';

const NEW_ADDRESS = 'new';

/** Checkout: delivery address, shipping by governorate, cash on delivery. Requires an account. */
export function StoreCheckoutPage() {
    const { storeSlug } = useParams();
    const { store } = useStorefront();
    const { isAuthenticated, customer, api } = useCustomerAuth();
    const { items, clear } = useCart();
    const navigate = useNavigate();
    const toast = useToast();
    const [quote, setQuote] = useState(null);
    const [addresses, setAddresses] = useState(null);
    const [shipping, setShipping] = useState(null);
    const [loadError, setLoadError] = useState(null);
    const [choice, setChoice] = useState(null);
    const [address, setAddress] = useState(EMPTY_ADDRESS);
    const [saveAddress, setSaveAddress] = useState(true);
    const [note, setNote] = useState('');
    const [errors, setErrors] = useState({});
    const [placing, setPlacing] = useState(false);
    const [coupon, setCoupon] = useState(null);
    const [couponError, setCouponError] = useState(null);

    const applyCoupon = async (code) => {
        setCouponError(null);

        try {
            setCoupon(await api.checkCoupon(code, items));
        } catch (error) {
            setCoupon(null);
            setCouponError(error.errors?.coupon_code ?? error.message);
            throw error;
        }
    };

    // A code from a coupon link is applied as soon as the cart is loaded; if it no longer
    // applies, the reason shows under the code box and it's forgotten.
    useEffect(() => {
        const saved = getSavedCoupon(storeSlug);

        if (quote && saved && !coupon) {
            applyCoupon(saved).catch(() => clearSavedCoupon(storeSlug));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [quote]);

    // The cart changed: check the applied code again (the discount or eligibility may change).
    useEffect(() => {
        if (coupon && items.length > 0) {
            applyCoupon(coupon.code).catch(() => {});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items]);

    useEffect(() => {
        if (store) {
            document.title = `${t('إتمام الطلب')} | ${store.name}`;
        }
    }, [store]);

    useEffect(() => {
        if (!isAuthenticated || items.length === 0) {
            return undefined;
        }

        let cancelled = false;

        Promise.all([storefrontApi.quoteCart(storeSlug, items), api.addresses(), api.shipping()])
            .then(([cartQuote, savedAddresses, shippingRates]) => {
                if (cancelled) {
                    return;
                }

                setQuote(cartQuote);
                setAddresses(savedAddresses);
                setShipping(shippingRates);
                setChoice((current) => current ?? (savedAddresses.find((saved) => saved.is_default)?.address_id ?? NEW_ADDRESS));
                setAddress((current) => (current.recipient_name ? current : { ...EMPTY_ADDRESS, recipient_name: customer?.full_name ?? '', phone: customer?.phone ?? '' }));
            })
            .catch((error) => !cancelled && setLoadError(error.message));

        return () => {
            cancelled = true;
        };
    }, [isAuthenticated, items, storeSlug, api, customer]);

    const deliveryAddress = choice === NEW_ADDRESS ? address : addresses?.find((saved) => saved.address_id === choice);
    const deliverable = useMemo(() => shipping?.rates.map((rate) => rate.governorate_id) ?? [], [shipping]);

    const shippingFee = useMemo(() => {
        const rate = shipping?.rates.find((candidate) => candidate.governorate_id === deliveryAddress?.governorate_id);

        if (!rate) {
            return null;
        }

        return shipping.free_shipping_threshold !== null && quote?.subtotal >= shipping.free_shipping_threshold ? 0 : rate.price;
    }, [shipping, deliveryAddress, quote]);

    if (!isAuthenticated) {
        return <Navigate to={`/${storeSlug}/account/login?next=checkout`} replace />;
    }

    // While placing, the cart is cleared right before leaving for the order page.
    if (items.length === 0 && !placing) {
        return <Navigate to={`/${storeSlug}/cart`} replace />;
    }

    if (loadError) {
        return <EmptyState icon="alert-triangle" title={t('تعذر تحميل صفحة الطلب')} description={loadError} />;
    }

    if (!quote || !addresses || !shipping) {
        return (
            <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
                <Skeleton className="h-96 rounded-2xl" />
                <Skeleton className="h-72 rounded-2xl" />
            </div>
        );
    }

    const unavailable = quote.lines.some((line) => line.status === 'out_of_stock' || line.status === 'unavailable' || line.status === 'insufficient');
    const closed = store && !store.accepting_orders;
    const belowMinimum = store?.min_order_total ? store.min_order_total - quote.subtotal : 0;

    const placeOrder = async () => {
        setErrors({});
        setPlacing(true);

        try {
            const order = await api.placeOrder({
                items,
                ...(choice === NEW_ADDRESS ? { address, save_address: saveAddress } : { address_id: choice }),
                referral_code: getReferralCode(storeSlug),
                coupon_code: coupon?.code ?? null,
                note: note.trim() || null,
            });

            navigate(`/${storeSlug}/account/orders/${order.number}?placed=1`, { replace: true });
            clear();
            clearSavedCoupon(storeSlug);
        } catch (error) {
            const fieldErrors = Object.fromEntries(Object.entries(error.errors ?? {}).map(([key, message]) => [key.replace(/^address\./, ''), message]));

            setErrors(fieldErrors);

            if (fieldErrors.coupon_code) {
                setCoupon(null);
                setCouponError(fieldErrors.coupon_code);
            }

            toast.error(t('تعذر إتمام الطلب'), Object.values(fieldErrors)[0] ?? error.message);
            setPlacing(false);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold text-ink sm:text-3xl">{t('إتمام الطلب')}</h1>

            <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">
                <div className="flex flex-col gap-6">
                    <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
                        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-ink">
                            <Icon name="map-pin" className="size-5 text-primary" />
                            {t('عنوان التوصيل')}
                        </h2>

                        <div className="flex flex-col gap-3" role="radiogroup" aria-label={t('عنوان التوصيل')}>
                            {addresses.map((saved) => {
                                const servable = deliverable.includes(saved.governorate_id);

                                return (
                                    <label key={saved.address_id} className={cn('flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition', choice === saved.address_id ? 'border-primary bg-primary-soft' : 'border-line hover:border-line-strong', !servable && 'opacity-60')}>
                                        <input type="radio" name="address" checked={choice === saved.address_id} onChange={() => setChoice(saved.address_id)} className="mt-1 accent-[var(--color-primary)]" />
                                        <span className="min-w-0 text-sm">
                                            <span className="block font-semibold text-ink">
                                                {saved.recipient_name} <span className="ltr inline-block font-normal text-muted">{saved.phone}</span>
                                            </span>
                                            <span className="mt-0.5 block text-ink-2">{formatAddress(saved)}</span>
                                            {!servable && <span className="mt-1 block text-xs font-medium text-danger">{t('المتجر لا يوصّل إلى هذه المحافظة حالياً')}</span>}
                                        </span>
                                    </label>
                                );
                            })}
                            {addresses.length > 0 && (
                                <label className={cn('flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-sm font-semibold transition', choice === NEW_ADDRESS ? 'border-primary bg-primary-soft text-primary' : 'border-line text-ink hover:border-line-strong')}>
                                    <input type="radio" name="address" checked={choice === NEW_ADDRESS} onChange={() => setChoice(NEW_ADDRESS)} className="accent-[var(--color-primary)]" />
                                    {t('التوصيل لعنوان جديد')}
                                </label>
                            )}
                        </div>

                        {choice === NEW_ADDRESS && (
                            <div className={cn('flex flex-col gap-4', addresses.length > 0 && 'mt-5 border-t border-line pt-5')}>
                                <AddressFields value={address} onChange={setAddress} errors={errors} deliverable={deliverable} />
                                <Checkbox label={t('احفظ هذا العنوان لطلباتي القادمة')} checked={saveAddress} onChange={(event) => setSaveAddress(event.target.checked)} />
                            </div>
                        )}
                    </section>

                    <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
                        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-ink">
                            <Icon name="wallet" className="size-5 text-primary" />
                            {t('طريقة الدفع')}
                        </h2>
                        <div className="flex items-center gap-3 rounded-xl border border-primary bg-primary-soft p-4 text-sm">
                            <Icon name="check-circle" className="size-5 text-primary" />
                            <span>
                                <span className="block font-semibold text-ink">{t('الدفع عند الاستلام')}</span>
                                <span className="text-ink-2">{t('ادفع نقداً للمندوب عند استلام طلبك.')}</span>
                            </span>
                        </div>
                        <Field label={t('ملاحظات للمتجر')} optional className="mt-5">
                            {(props) => <Textarea {...props} value={note} onChange={(event) => setNote(event.target.value)} placeholder={t('مثال: اتصل قبل الوصول بنصف ساعة')} maxLength={500} />}
                        </Field>
                    </section>
                </div>

                <aside className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 lg:sticky lg:top-36">
                    <h2 className="text-lg font-semibold text-ink">{t('ملخص الطلب')}</h2>
                    <ul className="flex flex-col gap-3">
                        {quote.lines.map((line) => (
                            <li key={line.variant_id} className="flex items-center gap-3">
                                <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                                    <ProductImage src={line.image_url} alt="" />
                                    <span className="absolute -top-1 -end-1 grid size-5 place-items-center rounded-full bg-ink text-[10px] font-bold text-surface">{line.quantity}</span>
                                </span>
                                <span className="min-w-0 flex-1 text-sm">
                                    <span className="block truncate font-medium text-ink">{line.name ?? t('منتج غير متاح')}</span>
                                    {line.variant_title && <span className="block text-xs text-muted">{line.variant_title}</span>}
                                    {(errors[`items.${line.variant_id}`] || line.status !== 'ok') && <span className="block text-xs text-danger">{errors[`items.${line.variant_id}`] ?? t('الكمية المطلوبة غير متاحة، عدّل السلة')}</span>}
                                </span>
                                <span className="text-sm font-semibold text-ink">{formatMoney(line.line_total)}</span>
                            </li>
                        ))}
                    </ul>
                    <dl className="flex flex-col gap-2.5 border-t border-line pt-4 text-sm">
                        <div className="flex justify-between">
                            <dt className="text-muted">{t('المنتجات')}</dt>
                            <dd className="text-ink">{formatMoney(quote.subtotal)}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-muted">{t('الشحن')}</dt>
                            <dd className="text-ink">{shippingFee === null ? t('اختر المحافظة') : shippingFee === 0 ? t('مجاني') : formatMoney(shippingFee)}</dd>
                        </div>
                        {coupon && (coupon.discount > 0 || (coupon.free_shipping && shippingFee > 0)) && (
                            <div className="flex justify-between text-success">
                                <dt>{t('خصم الكوبون {code}', { code: coupon.code })}</dt>
                                <dd className="ltr">-{formatMoney(coupon.free_shipping ? shippingFee : coupon.discount)}</dd>
                            </div>
                        )}
                        <div className="flex justify-between border-t border-line pt-3 text-base">
                            <dt className="font-semibold text-ink">{t('الإجمالي')}</dt>
                            <dd className="font-bold text-ink">{formatMoney(Math.max(0, quote.subtotal - (coupon?.discount ?? 0)) + (coupon?.free_shipping ? 0 : (shippingFee ?? 0)))}</dd>
                        </div>
                    </dl>
                    <CouponBox
                        coupon={coupon}
                        error={couponError}
                        onApply={applyCoupon}
                        onRemove={() => {
                            setCoupon(null);
                            setCouponError(null);
                            clearSavedCoupon(storeSlug);
                        }}
                    />
                    {shipping.free_shipping_threshold !== null && quote.subtotal < shipping.free_shipping_threshold && (
                        <Alert tone="info" icon="truck">
                            {t('أضف منتجات بقيمة {amount} للحصول على شحن مجاني.', { amount: formatMoney(shipping.free_shipping_threshold - quote.subtotal) })}
                        </Alert>
                    )}
                    {unavailable && <Alert tone="warning">{t('بعض المنتجات تغيّر توفرها، راجع السلة قبل إتمام الطلب.')}</Alert>}
                    {closed && <Alert tone="warning">{store.closed_message}</Alert>}
                    {belowMinimum > 0 && (
                        <Alert tone="warning">{t('أقل قيمة للطلب {amount}، أضف منتجات بقيمة {remaining}.', { amount: formatMoney(store.min_order_total), remaining: formatMoney(belowMinimum) })}</Alert>
                    )}
                    <Button size="lg" icon="check" loading={placing} disabled={unavailable || shippingFee === null || closed || belowMinimum > 0} onClick={placeOrder}>
                        {t('تأكيد الطلب')}
                    </Button>
                    <p className="text-center text-xs text-muted">{t('بالضغط على تأكيد الطلب ستصلك تفاصيله في صفحة طلباتي.')}</p>
                </aside>
            </div>
        </div>
    );
}
