import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert, Badge } from '@/components/ui/Display';
import { Checkbox, Field, Input, OptionCards, Switch } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { Drawer } from '@/components/ui/Overlay';
import { Skeleton, Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';
import { useCategories } from '@/features/products/useCategories';
import { useClickOutside, useDebouncedValue } from '@/hooks/common';
import { t } from '@/i18n';
import { CURRENCY } from '@/lib/constants';
import { affiliatesApi } from '@/services/affiliatesApi';
import { couponsApi } from '@/services/couponsApi';
import { productsApi } from '@/services/productsApi';

const TYPES = [
    { value: 'percentage', label: t('نسبة مئوية'), icon: 'percent', description: t('مثال: خصم 15%') },
    { value: 'fixed', label: t('مبلغ ثابت'), icon: 'wallet', description: t('مثال: خصم 100 ج.م') },
    { value: 'free_shipping', label: t('شحن مجاني'), icon: 'truck', description: t('يلغي رسوم التوصيل') },
];

const APPLIES = [
    { value: 'all', label: t('كل المنتجات') },
    { value: 'categories', label: t('أقسام محددة') },
    { value: 'products', label: t('منتجات محددة') },
];

const EMPTY = {
    code: '',
    description: '',
    type: 'percentage',
    value: '',
    max_discount: '',
    min_subtotal: '',
    applies_to: 'all',
    category_ids: [],
    products: [],
    usage_limit: '',
    per_customer_limit: '1',
    first_order_only: false,
    affiliate: null,
    starts_at: '',
    ends_at: '',
    is_active: true,
};

const toDateInput = (value) => (value ? value.slice(0, 10) : '');
const numberOrNull = (value) => (value === '' || value == null ? null : Number(value));

function randomCode() {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    return Array.from({ length: 8 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
}

/** Search box over a list endpoint; picks one result. Used for products and the affiliate. */
function SearchPick({ search, renderLabel, onPick, placeholder }) {
    const [term, setTerm] = useState('');
    const query = useDebouncedValue(term, 250);
    const [results, setResults] = useState(null);
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);

    useClickOutside(containerRef, () => setOpen(false), open);

    useEffect(() => {
        if (!open) {
            return;
        }

        setResults(null);
        search(query)
            .then((response) => setResults(response.data))
            .catch(() => setResults([]));
    }, [query, open, search]);

    return (
        <div ref={containerRef} className="relative">
            <Input type="search" icon="search" value={term} onFocus={() => setOpen(true)} onChange={(event) => setTerm(event.target.value)} placeholder={placeholder} aria-label={placeholder} />
            {open && (
                <div className="mk-card mk-scroll absolute inset-x-0 top-12 z-20 max-h-64 overflow-y-auto p-1.5 shadow-pop">
                    {results === null ? (
                        <div className="grid place-items-center p-4">
                            <Spinner className="size-5" />
                        </div>
                    ) : results.length === 0 ? (
                        <p className="p-3 text-center text-sm text-muted">{t('لا توجد نتائج.')}</p>
                    ) : (
                        results.map((result, index) => (
                            <button
                                key={index}
                                type="button"
                                onClick={() => {
                                    onPick(result);
                                    setTerm('');
                                    setOpen(false);
                                }}
                                className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-start text-sm transition hover:bg-surface-3"
                            >
                                {renderLabel(result)}
                                <Icon name="plus" className="size-4 text-primary" />
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

/** Create or edit a coupon (`couponId` null = new). */
export function CouponFormDrawer({ open, couponId, onClose, onSaved }) {
    const toast = useToast();
    const { categories } = useCategories();
    const [values, setValues] = useState(EMPTY);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open) {
            return;
        }

        setErrors({});

        if (!couponId) {
            setValues({ ...EMPTY, code: randomCode() });

            return;
        }

        setLoading(true);
        couponsApi
            .get(couponId)
            .then((coupon) =>
                setValues({
                    code: coupon.code,
                    description: coupon.description ?? '',
                    type: coupon.type,
                    value: coupon.value == null ? '' : String(coupon.value),
                    max_discount: coupon.max_discount == null ? '' : String(coupon.max_discount),
                    min_subtotal: coupon.min_subtotal == null ? '' : String(coupon.min_subtotal),
                    applies_to: coupon.applies_to,
                    category_ids: coupon.category_ids,
                    products: coupon.targets?.products ?? [],
                    usage_limit: coupon.usage_limit == null ? '' : String(coupon.usage_limit),
                    per_customer_limit: coupon.per_customer_limit == null ? '' : String(coupon.per_customer_limit),
                    first_order_only: coupon.first_order_only,
                    affiliate: coupon.affiliate,
                    starts_at: toDateInput(coupon.starts_at),
                    ends_at: toDateInput(coupon.ends_at),
                    is_active: coupon.is_active,
                }),
            )
            .catch((error) => toast.error(t('تعذر تحميل الكوبون'), error.message))
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, couponId]);

    const set = (patch) => {
        setValues((current) => ({ ...current, ...patch }));
        setErrors((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !(key in patch))));
    };

    const submit = async (event) => {
        event.preventDefault();
        setSubmitting(true);

        try {
            const payload = {
                code: values.code,
                description: values.description.trim() || null,
                type: values.type,
                value: values.type === 'free_shipping' ? null : numberOrNull(values.value),
                max_discount: values.type === 'percentage' ? numberOrNull(values.max_discount) : null,
                min_subtotal: numberOrNull(values.min_subtotal),
                applies_to: values.applies_to,
                category_ids: values.applies_to === 'categories' ? values.category_ids : null,
                product_ids: values.applies_to === 'products' ? values.products.map((product) => product.product_id) : null,
                usage_limit: numberOrNull(values.usage_limit),
                per_customer_limit: numberOrNull(values.per_customer_limit),
                first_order_only: values.first_order_only,
                affiliate_id: values.affiliate?.affiliate_id ?? null,
                // Dates run to the end of the chosen day.
                starts_at: values.starts_at ? new Date(`${values.starts_at}T00:00:00`).toISOString() : null,
                ends_at: values.ends_at ? new Date(`${values.ends_at}T23:59:59`).toISOString() : null,
                is_active: values.is_active,
            };
            const saved = couponId ? await couponsApi.update(couponId, payload) : await couponsApi.create(payload);

            toast.success(couponId ? t('تم حفظ الكوبون') : t('تم إنشاء الكوبون {code}', { code: saved.code }));
            onSaved(saved);
        } catch (error) {
            setErrors(error.errors ?? {});
            toast.error(t('تعذر حفظ الكوبون'), error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const money = <span className="px-2 text-sm text-muted">{CURRENCY}</span>;
    const searchProducts = (search) => productsApi.list({ search, per_page: 10 });
    const searchAffiliates = (search) => affiliatesApi.list({ search, status: 'active', per_page: 10 });

    return (
        <Drawer
            open={open}
            onClose={onClose}
            size="lg"
            icon="gift"
            title={couponId ? t('تعديل الكوبون') : t('كوبون جديد')}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>
                        {t('إلغاء')}
                    </Button>
                    <Button type="submit" form="coupon-form" loading={submitting} icon="check" disabled={loading}>
                        {t('حفظ الكوبون')}
                    </Button>
                </>
            }
        >
            {loading ? (
                <div className="flex flex-col gap-4 p-6">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-32 w-full" />
                </div>
            ) : (
                <form id="coupon-form" onSubmit={submit} noValidate className="flex flex-col gap-6 p-6">
                    <section className="grid gap-4 sm:grid-cols-2">
                        <Field
                            label={t('الكود')}
                            required
                            error={errors.code}
                            hint={t('حروف إنجليزية وأرقام؛ العميل يكتبه بأي حالة أحرف.')}
                            action={
                                <button type="button" onClick={() => set({ code: randomCode() })} className="text-xs font-medium text-primary hover:underline">
                                    {t('توليد كود')}
                                </button>
                            }
                        >
                            {(props) => <Input {...props} value={values.code} onChange={(event) => set({ code: event.target.value.toUpperCase().replace(/\s+/g, '') })} dir="ltr" className="text-start font-mono tracking-wider" maxLength={32} aria-invalid={errors.code ? 'true' : undefined} />}
                        </Field>
                        <Field label={t('وصف داخلي')} optional error={errors.description}>
                            {(props) => <Input {...props} value={values.description} onChange={(event) => set({ description: event.target.value })} maxLength={200} placeholder={t('مثال: عرض العيد')} />}
                        </Field>
                    </section>

                    <section className="flex flex-col gap-4">
                        <h3 className="text-sm font-semibold text-ink">{t('الخصم')}</h3>
                        <OptionCards options={TYPES} value={values.type} onChange={(type) => set({ type })} name="coupon-type" />
                        <div className="grid gap-4 sm:grid-cols-3">
                            {values.type !== 'free_shipping' && (
                                <Field label={values.type === 'percentage' ? t('النسبة') : t('المبلغ')} required error={errors.value}>
                                    {(props) => (
                                        <Input
                                            {...props}
                                            type="number"
                                            inputMode="decimal"
                                            min={0}
                                            max={values.type === 'percentage' ? 100 : undefined}
                                            value={values.value}
                                            onChange={(event) => set({ value: event.target.value })}
                                            suffix={values.type === 'percentage' ? <span className="px-2 text-sm text-muted">%</span> : money}
                                            aria-invalid={errors.value ? 'true' : undefined}
                                        />
                                    )}
                                </Field>
                            )}
                            {values.type === 'percentage' && (
                                <Field label={t('أقصى خصم')} optional error={errors.max_discount}>
                                    {(props) => <Input {...props} type="number" inputMode="decimal" min={0} value={values.max_discount} onChange={(event) => set({ max_discount: event.target.value })} suffix={money} />}
                                </Field>
                            )}
                            <Field label={t('أقل قيمة للطلب')} optional error={errors.min_subtotal}>
                                {(props) => <Input {...props} type="number" inputMode="decimal" min={0} value={values.min_subtotal} onChange={(event) => set({ min_subtotal: event.target.value })} suffix={money} />}
                            </Field>
                        </div>
                    </section>

                    {values.type !== 'free_shipping' && (
                        <section className="flex flex-col gap-3">
                            <h3 className="text-sm font-semibold text-ink">{t('ينطبق على')}</h3>
                            <OptionCards options={APPLIES} value={values.applies_to} onChange={(applies_to) => set({ applies_to })} name="coupon-applies" />
                            {values.applies_to === 'categories' && (
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {(categories ?? []).map((category) => (
                                        <Checkbox
                                            key={category.category_id}
                                            label={category.name}
                                            checked={values.category_ids.includes(category.category_id)}
                                            onChange={(event) => set({ category_ids: event.target.checked ? [...values.category_ids, category.category_id] : values.category_ids.filter((id) => id !== category.category_id) })}
                                        />
                                    ))}
                                </div>
                            )}
                            {values.applies_to === 'products' && (
                                <>
                                    <SearchPick
                                        search={searchProducts}
                                        placeholder={t('ابحث عن منتج لإضافته...')}
                                        renderLabel={(product) => <span className="truncate text-ink">{product.name}</span>}
                                        onPick={(product) => !values.products.some((item) => item.product_id === product.product_id) && set({ products: [...values.products, { product_id: product.product_id, name: product.name }] })}
                                    />
                                    <div className="flex flex-wrap gap-2">
                                        {values.products.map((product) => (
                                            <Badge key={product.product_id} tone="primary" className="gap-2">
                                                {product.name}
                                                <button type="button" onClick={() => set({ products: values.products.filter((item) => item.product_id !== product.product_id) })} aria-label={t('إزالة {name}', { name: product.name })}>
                                                    <Icon name="x" className="size-3" />
                                                </button>
                                            </Badge>
                                        ))}
                                    </div>
                                </>
                            )}
                            {(errors.category_ids || errors.product_ids) && <Alert tone="danger">{errors.category_ids || errors.product_ids}</Alert>}
                        </section>
                    )}

                    <section className="flex flex-col gap-4">
                        <h3 className="text-sm font-semibold text-ink">{t('حدود الاستخدام')}</h3>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label={t('عدد مرات الاستخدام الكلي')} optional error={errors.usage_limit} hint={t('اتركه فارغاً بلا حد.')}>
                                {(props) => <Input {...props} type="number" inputMode="numeric" min={1} step={1} value={values.usage_limit} onChange={(event) => set({ usage_limit: event.target.value })} />}
                            </Field>
                            <Field label={t('لكل عميل')} optional error={errors.per_customer_limit} hint={t('اتركه فارغاً بلا حد.')}>
                                {(props) => <Input {...props} type="number" inputMode="numeric" min={1} step={1} value={values.per_customer_limit} onChange={(event) => set({ per_customer_limit: event.target.value })} />}
                            </Field>
                            <Field label={t('يبدأ في')} optional error={errors.starts_at}>
                                {(props) => <Input {...props} type="date" value={values.starts_at} onChange={(event) => set({ starts_at: event.target.value })} />}
                            </Field>
                            <Field label={t('ينتهي في')} optional error={errors.ends_at}>
                                {(props) => <Input {...props} type="date" value={values.ends_at} min={values.starts_at || undefined} onChange={(event) => set({ ends_at: event.target.value })} />}
                            </Field>
                        </div>
                        <Switch checked={values.first_order_only} onChange={(first_order_only) => set({ first_order_only })} label={t('لأول طلب فقط')} description={t('للعملاء الذين لم يطلبوا من متجرك من قبل.')} />
                    </section>

                    <section className="flex flex-col gap-3">
                        <h3 className="text-sm font-semibold text-ink">{t('كوبون مسوق')}</h3>
                        <p className="text-xs leading-relaxed text-muted">{t('اربط الكوبون بمسوق لتُحسب له الطلبات التي تستخدمه حتى بدون رابطه، وعمولته على قيمة المنتجات بعد الخصم.')}</p>
                        {values.affiliate ? (
                            <div className="flex items-center justify-between gap-3 rounded-xl border border-line p-3 text-sm">
                                <span className="font-medium text-ink">{values.affiliate.full_name}</span>
                                <Button size="sm" variant="ghost" icon="x" onClick={() => set({ affiliate: null })}>
                                    {t('إزالة')}
                                </Button>
                            </div>
                        ) : (
                            <SearchPick
                                search={searchAffiliates}
                                placeholder={t('ابحث عن مسوق بالاسم أو الهاتف...')}
                                renderLabel={(affiliate) => <span className="truncate text-ink">{affiliate.full_name}</span>}
                                onPick={(affiliate) => set({ affiliate: { affiliate_id: affiliate.affiliate_id, full_name: affiliate.full_name } })}
                            />
                        )}
                        {errors.affiliate_id && <p className="text-xs text-danger">{errors.affiliate_id}</p>}
                    </section>

                    <Switch checked={values.is_active} onChange={(is_active) => set({ is_active })} label={t('الكوبون فعّال')} description={t('أوقفه في أي وقت دون حذفه.')} />
                </form>
            )}
        </Drawer>
    );
}
