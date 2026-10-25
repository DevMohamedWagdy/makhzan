import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Alert, Card } from '@/components/ui/Display';
import { Field, Input, OptionCards, Switch, Textarea } from '@/components/ui/Form';
import { useToast } from '@/context/ToastContext';
import { itemLabel } from '@/features/inventory/InventoryModals';
import { VariantPicker } from '@/features/inventory/VariantPicker';
import { AddressFields, EMPTY_ADDRESS } from '@/features/storefront/AddressFields';
import { t } from '@/i18n';
import { CURRENCY, ORDER_SOURCES } from '@/lib/constants';
import { formatMoney, formatNumber } from '@/lib/format';
import { ordersApi } from '@/services/ordersApi';

const SOURCE_OPTIONS = Object.entries(ORDER_SOURCES)
    .filter(([value]) => value !== 'store')
    .map(([value, config]) => ({
        value,
        label: config.label,
        icon: config.icon,
    }));

const numberOrNull = (value) => (value === '' || value == null ? null : Number(value));

/**
 * Records an order taken outside the storefront (WhatsApp, Messenger, a call, in person): the
 * channel, products, delivery address, agreed shipping fee and discount. Stock is deducted
 * and the customer is matched by phone, or added to the store's customers.
 */
export function ManualOrderPage() {
    const navigate = useNavigate();
    const toast = useToast();
    const [source, setSource] = useState('whatsapp');
    const [items, setItems] = useState([]);
    const [address, setAddress] = useState(EMPTY_ADDRESS);
    const [shippingFee, setShippingFee] = useState('');
    const [discount, setDiscount] = useState('');
    const [note, setNote] = useState('');
    const [confirm, setConfirm] = useState(true);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const updateItem = (variantId, patch) => setItems((current) => current.map((item) => (item.variant_id === variantId ? { ...item, ...patch } : item)));
    const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * item.price, 0);
    const total = Math.max(0, subtotal - (Number(discount) || 0)) + (Number(shippingFee) || 0);
    const addressErrors = Object.fromEntries(
        Object.entries(errors)
            .filter(([key]) => key.startsWith('address.'))
            .map(([key, message]) => [key.slice('address.'.length), message]),
    );

    const submit = async (event) => {
        event.preventDefault();

        const nextErrors = {};

        if (items.length === 0) {
            nextErrors.items = t('أضف منتجاً واحداً على الأقل');
        }

        items.forEach((item) => {
            if (!(Number(item.quantity) >= 1) || !Number.isInteger(Number(item.quantity))) {
                nextErrors[`items.${item.variant_id}`] = t('أدخل كمية لا تقل عن 1');
            }
        });

        if (Number(discount) > subtotal) {
            nextErrors.discount = t('الخصم أكبر من إجمالي المنتجات');
        }

        setErrors(nextErrors);

        if (Object.keys(nextErrors).length) {
            return;
        }

        setSubmitting(true);

        try {
            const order = await ordersApi.create({
                source,
                items: items.map((item) => ({
                    variant_id: item.variant_id,
                    quantity: Number(item.quantity),
                })),
                address,
                shipping_fee: numberOrNull(shippingFee),
                discount: numberOrNull(discount),
                note: note.trim() || null,
                confirm,
            });

            toast.success(t('تم تسجيل الطلب #{number}', { number: order.number }));
            navigate(`/dashboard/orders?order=${order.order_id}`);
        } catch (error) {
            setErrors(error.errors ?? {});
            toast.error(t('تعذر تسجيل الطلب'), error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <PageHeader title={t('طلب يدوي جديد')} description={t('سجّل طلباً وصلك على واتساب أو ماسنجر أو بالتليفون، وسيُخصم من المخزون مثل طلبات المتجر.')} breadcrumbs={[t('لوحة التحكم'), t('الطلبات'), t('طلب يدوي')]} />

            <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-3">
                <div className="flex flex-col gap-6 lg:col-span-2">
                    <Card title={t('مصدر الطلب')}>
                        <OptionCards options={SOURCE_OPTIONS} value={source} onChange={setSource} name="order-source" />
                        {errors.source && <p className="mt-2 text-xs text-danger">{errors.source}</p>}
                    </Card>

                    <Card title={t('المنتجات')} description={t('بسعر البيع الحالي، ويمكنك إضافة خصم من ملخص الطلب.')}>
                        <div className="flex flex-col gap-4">
                            <VariantPicker
                                excludedIds={items.map((item) => item.variant_id)}
                                onPick={(item) => {
                                    setItems((current) => [
                                        ...current,
                                        {
                                            variant_id: item.variant_id,
                                            label: itemLabel(item),
                                            sku: item.sku,
                                            price: Number(item.price) || 0,
                                            stock: item.stock,
                                            quantity: '1',
                                        },
                                    ]);
                                    setErrors((current) => ({
                                        ...current,
                                        items: undefined,
                                    }));
                                }}
                            />
                            {errors.items && <Alert tone="danger">{errors.items}</Alert>}

                            {items.length === 0 ? (
                                <p className="rounded-xl border border-dashed border-line-strong p-6 text-center text-sm text-muted">{t('ابحث عن المنتجات وأضفها للطلب.')}</p>
                            ) : (
                                <div className="mk-scroll overflow-x-auto">
                                    <table className="w-full min-w-[520px] text-sm">
                                        <thead className="text-xs text-muted">
                                            <tr>
                                                <th className="px-2 py-2 text-start font-medium">{t('المنتج')}</th>
                                                <th className="px-2 py-2 text-start font-medium">{t('السعر')}</th>
                                                <th className="w-28 px-2 py-2 text-start font-medium">{t('الكمية')}</th>
                                                <th className="px-2 py-2 text-start font-medium">{t('الإجمالي')}</th>
                                                <th className="w-10" />
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-line">
                                            {items.map((item) => (
                                                <tr key={item.variant_id}>
                                                    <td className="px-2 py-2.5">
                                                        <span className="block font-medium text-ink">{item.label}</span>
                                                        <span className="text-xs text-muted">
                                                            {t('المخزون {count}', {
                                                                count: formatNumber(item.stock),
                                                            })}
                                                        </span>
                                                        {errors[`items.${item.variant_id}`] && <p className="text-[11px] text-danger">{errors[`items.${item.variant_id}`]}</p>}
                                                    </td>
                                                    <td className="px-2 py-2.5 whitespace-nowrap text-ink-2">{formatMoney(item.price)}</td>
                                                    <td className="px-2 py-2.5 align-top">
                                                        <Input
                                                            type="number"
                                                            inputMode="numeric"
                                                            min={1}
                                                            step={1}
                                                            value={item.quantity}
                                                            onChange={(event) =>
                                                                updateItem(item.variant_id, {
                                                                    quantity: event.target.value,
                                                                })
                                                            }
                                                            className="h-9 text-sm"
                                                            aria-label={t('الكمية')}
                                                        />
                                                    </td>
                                                    <td className="px-2 py-2.5 font-semibold whitespace-nowrap text-ink">{formatMoney((Number(item.quantity) || 0) * item.price)}</td>
                                                    <td className="px-2 py-2.5">
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            icon="trash"
                                                            onClick={() => setItems((current) => current.filter((line) => line.variant_id !== item.variant_id))}
                                                            aria-label={t('إزالة {name}', {
                                                                name: item.label,
                                                            })}
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </Card>

                    <Card title={t('العميل وعنوان التوصيل')} description={t('لو رقم الهاتف مسجل عندك سيُضاف الطلب لنفس العميل، وإلا سيُضاف عميل جديد.')}>
                        <AddressFields value={address} onChange={setAddress} errors={addressErrors} />
                    </Card>
                </div>

                <div className="flex flex-col gap-6">
                    <Card title={t('ملخص الطلب')}>
                        <div className="flex flex-col gap-4">
                            <Field label={t('مصاريف الشحن')} optional hint={t('اتركه فارغاً لاستخدام سعر الشحن للمحافظة.')} error={errors.shipping_fee}>
                                {(props) => <Input {...props} type="number" inputMode="decimal" min={0} step="0.01" value={shippingFee} onChange={(event) => setShippingFee(event.target.value)} suffix={<span className="px-2 text-xs text-muted">{CURRENCY}</span>} />}
                            </Field>
                            <Field label={t('خصم')} optional error={errors.discount}>
                                {(props) => (
                                    <Input
                                        {...props}
                                        type="number"
                                        inputMode="decimal"
                                        min={0}
                                        step="0.01"
                                        value={discount}
                                        onChange={(event) => setDiscount(event.target.value)}
                                        suffix={<span className="px-2 text-xs text-muted">{CURRENCY}</span>}
                                        aria-invalid={errors.discount ? 'true' : undefined}
                                    />
                                )}
                            </Field>
                            <Field label={t('ملاحظات')} optional error={errors.note}>
                                {(props) => <Textarea {...props} value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} placeholder={t('مثال: التسليم بعد الساعة 5')} />}
                            </Field>
                            <Switch checked={confirm} onChange={setConfirm} label={t('تأكيد الطلب مباشرة')} description={t('اتفقت مع العميل بالفعل، فيبدأ الطلب كمؤكد.')} />
                        </div>

                        <dl className="mt-5 flex flex-col gap-2 border-t border-line pt-4 text-sm">
                            <div className="flex justify-between text-ink-2">
                                <dt>{t('المنتجات')}</dt>
                                <dd>{formatMoney(subtotal)}</dd>
                            </div>
                            {Number(discount) > 0 && (
                                <div className="flex justify-between text-success">
                                    <dt>{t('الخصم')}</dt>
                                    <dd>−{formatMoney(Number(discount))}</dd>
                                </div>
                            )}
                            <div className="flex justify-between text-ink-2">
                                <dt>{t('الشحن')}</dt>
                                <dd>{shippingFee === '' ? t('حسب المحافظة') : formatMoney(Number(shippingFee))}</dd>
                            </div>
                            <div className="mt-1 flex items-center justify-between">
                                <dt className="font-semibold text-ink">{t('الإجمالي (الدفع عند الاستلام)')}</dt>
                                <dd className="mk-num text-xl font-semibold text-ink">{formatMoney(total)}</dd>
                            </div>
                        </dl>

                        <Button type="submit" loading={submitting} icon="check" className="mt-4 w-full">
                            {t('تسجيل الطلب')}
                        </Button>
                        <Button variant="secondary" className="mt-2 w-full" onClick={() => navigate(-1)} disabled={submitting}>
                            {t('إلغاء')}
                        </Button>
                    </Card>
                </div>
            </form>
        </>
    );
}
