import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Display';
import { Field, Input, Select, Textarea } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Overlay';
import { useToast } from '@/context/ToastContext';
import { itemLabel } from '@/features/inventory/InventoryModals';
import { useWarehouses } from '@/features/inventory/useWarehouses';
import { VariantPicker } from '@/features/inventory/VariantPicker';
import { stockIn } from '@/features/inventory/WarehouseModals';
import { t } from '@/i18n';
import { CURRENCY, SUPPLIER_PAYMENT_METHODS } from '@/lib/constants';
import { formatMoney, formatNumber } from '@/lib/format';
import { suppliersApi } from '@/services/purchasingApi';

/** Today as YYYY-MM-DD in the browser's time zone. */
function today() {
    const now = new Date();

    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** Records money paid to a supplier; `onSaved(account)` gets the refreshed account. */
export function SupplierPaymentModal({ open, supplier, balance, onClose, onSaved }) {
    const toast = useToast();
    const [values, setValues] = useState({});
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) {
            setValues({ amount: balance > 0 ? String(balance) : '', paid_at: today(), method: 'cash', reference: '', note: '' });
            setErrors({});
        }
    }, [open, balance]);

    const set = (key) => (event) => {
        setValues((current) => ({ ...current, [key]: event.target.value }));
        setErrors((current) => ({ ...current, [key]: undefined }));
    };

    const submit = async (event) => {
        event.preventDefault();

        if (!(Number(values.amount) > 0)) {
            setErrors({ amount: t('أدخل المبلغ المدفوع') });

            return;
        }

        setSaving(true);

        try {
            const account = await suppliersApi.addPayment(supplier.supplier_id, {
                amount: Number(values.amount),
                paid_at: values.paid_at,
                method: values.method,
                reference: values.reference.trim() || null,
                note: values.note.trim() || null,
            });

            toast.success(t('تم تسجيل الدفعة'), t('{amount} لـ {name}', { amount: formatMoney(values.amount), name: supplier.name }));
            onSaved(account);
        } catch (error) {
            setErrors(error.errors ?? {});
            toast.error(t('تعذر تسجيل الدفعة'), error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            dismissible={!saving}
            icon="wallet"
            title={t('تسجيل دفعة للمورد')}
            description={supplier?.name}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={saving}>
                        {t('إلغاء')}
                    </Button>
                    <Button icon="check" loading={saving} onClick={submit}>
                        {t('تسجيل الدفعة')}
                    </Button>
                </>
            }
        >
            <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
                <Field label={t('المبلغ')} required error={errors.amount} hint={balance > 0 ? t('المستحق للمورد {amount}', { amount: formatMoney(balance) }) : undefined}>
                    {(props) => <Input {...props} type="number" inputMode="decimal" min={0} step="0.01" value={values.amount ?? ''} onChange={set('amount')} suffix={<span className="px-2 text-xs text-muted">{CURRENCY}</span>} autoFocus />}
                </Field>
                <Field label={t('تاريخ الدفع')} required error={errors.paid_at}>
                    {(props) => <Input {...props} type="date" max={today()} value={values.paid_at ?? ''} onChange={set('paid_at')} />}
                </Field>
                <Field label={t('طريقة الدفع')} required error={errors.method}>
                    {(props) => <Select {...props} value={values.method ?? 'cash'} onChange={set('method')} options={Object.entries(SUPPLIER_PAYMENT_METHODS).map(([value, label]) => ({ value, label }))} />}
                </Field>
                <Field label={t('رقم مرجعي')} optional error={errors.reference}>
                    {(props) => <Input {...props} value={values.reference ?? ''} onChange={set('reference')} maxLength={100} placeholder={t('رقم الإيصال أو التحويل')} />}
                </Field>
                <Field label={t('ملاحظات')} optional error={errors.note} className="sm:col-span-2">
                    {(props) => <Textarea {...props} value={values.note ?? ''} onChange={set('note')} maxLength={500} rows={2} />}
                </Field>
                <button type="submit" className="hidden" />
            </form>
        </Modal>
    );
}

/**
 * Goods sent back to a supplier from one warehouse. The stock leaves that warehouse and the value (quantity ×
 * cost) is taken off what the store owes the supplier.
 */
export function PurchaseReturnModal({ open, supplier, onClose, onSaved }) {
    const toast = useToast();
    const { warehouses } = useWarehouses();
    const [warehouseId, setWarehouseId] = useState('');
    const [items, setItems] = useState([]);
    const [note, setNote] = useState('');
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const fromId = warehouseId || (warehouses?.[0] ? String(warehouses[0].warehouse_id) : '');

    useEffect(() => {
        if (open) {
            setWarehouseId('');
            setItems([]);
            setNote('');
            setErrors({});
        }
    }, [open]);

    const updateItem = (index, patch) => setItems((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
    const total = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_cost) || 0), 0);

    const submit = async (event) => {
        event.preventDefault();

        const nextErrors = {};

        if (items.length === 0) {
            nextErrors.items = t('أضف صنفاً واحداً على الأقل');
        }

        items.forEach((item, index) => {
            const quantity = Number(item.quantity);

            if (!Number.isInteger(quantity) || quantity < 1) {
                nextErrors[`items.${index}.quantity`] = t('أدخل كمية لا تقل عن 1');
            } else if (quantity > stockIn(item.source, fromId)) {
                nextErrors[`items.${index}.quantity`] = t('المتاح في هذا المخزن {count}', { count: formatNumber(stockIn(item.source, fromId)) });
            }

            if (item.unit_cost === '' || Number(item.unit_cost) < 0) {
                nextErrors[`items.${index}.unit_cost`] = t('أدخل التكلفة');
            }
        });

        setErrors(nextErrors);

        if (Object.keys(nextErrors).length) {
            return;
        }

        setSaving(true);

        try {
            const saved = await suppliersApi.createReturn(supplier.supplier_id, {
                warehouse_id: Number(fromId),
                note: note.trim() || null,
                items: items.map((item) => ({ variant_id: item.source.variant_id, quantity: Number(item.quantity), unit_cost: Number(item.unit_cost) })),
            });

            toast.success(t('تم تسجيل المرتجع #{number}', { number: saved.number }), t('خُصم {amount} من حساب المورد.', { amount: formatMoney(saved.total) }));
            onSaved(saved);
        } catch (error) {
            setErrors(error.errors ?? {});
            toast.error(t('تعذر تسجيل المرتجع'), Object.values(error.errors ?? {})[0] ?? error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            dismissible={!saving}
            size="lg"
            icon="upload"
            title={t('مرتجع للمورد')}
            description={t('البضاعة تخرج من المخزن، وقيمتها تُخصم من المستحق لـ {name}.', { name: supplier?.name ?? '' })}
            footer={
                <>
                    <span className="me-auto text-sm text-muted">
                        {t('قيمة المرتجع')} <span className="mk-num font-semibold text-ink">{formatMoney(total)}</span>
                    </span>
                    <Button variant="secondary" onClick={onClose} disabled={saving}>
                        {t('إلغاء')}
                    </Button>
                    <Button icon="check" loading={saving} onClick={submit}>
                        {t('تسجيل المرتجع')}
                    </Button>
                </>
            }
        >
            {/* Tall enough for the product search results to open without being cut off. */}
            <form onSubmit={submit} noValidate className="flex min-h-80 flex-col gap-4">
                {warehouses?.length > 1 && (
                    <Field label={t('يخرج من مخزن')} error={errors.warehouse_id}>
                        {(props) => (
                            <Select
                                {...props}
                                value={fromId}
                                onChange={(event) => setWarehouseId(event.target.value)}
                                options={warehouses.map((warehouse) => ({ value: String(warehouse.warehouse_id), label: warehouse.name }))}
                            />
                        )}
                    </Field>
                )}

                <VariantPicker
                    excludedIds={items.map((item) => item.source.variant_id)}
                    stockOf={(item) => stockIn(item, fromId)}
                    placeholder={t('ابحث عن المنتج المرتجع...')}
                    onPick={(source) => {
                        setItems((current) => [...current, { source, quantity: '', unit_cost: source.cost == null ? '' : String(source.cost) }]);
                        setErrors((current) => ({ ...current, items: undefined }));
                    }}
                />
                {errors.items && <Alert tone="danger">{errors.items}</Alert>}

                {items.length > 0 && (
                    <div className="mk-scroll overflow-x-auto">
                        <table className="w-full min-w-[520px] text-sm">
                            <thead className="text-xs text-muted">
                                <tr>
                                    <th className="px-2 py-2 text-start font-medium">{t('المنتج')}</th>
                                    <th className="w-28 px-2 py-2 text-start font-medium">{t('الكمية')}</th>
                                    <th className="w-36 px-2 py-2 text-start font-medium">{t('تكلفة القطعة')}</th>
                                    <th className="w-10" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                                {items.map((item, index) => (
                                    <tr key={item.source.variant_id}>
                                        <td className="px-2 py-2.5">
                                            <span className="block font-medium text-ink">{itemLabel(item.source)}</span>
                                            <span className="text-xs text-muted">{t('المتاح {count}', { count: formatNumber(stockIn(item.source, fromId)) })}</span>
                                        </td>
                                        <td className="px-2 py-2.5 align-top">
                                            <Input type="number" inputMode="numeric" min={1} step={1} value={item.quantity} onChange={(event) => updateItem(index, { quantity: event.target.value })} className="h-9 text-sm" aria-label={t('الكمية')} aria-invalid={errors[`items.${index}.quantity`] ? 'true' : undefined} />
                                            {errors[`items.${index}.quantity`] && <p className="mt-1 text-2xs text-danger">{errors[`items.${index}.quantity`]}</p>}
                                        </td>
                                        <td className="px-2 py-2.5 align-top">
                                            <Input type="number" inputMode="decimal" min={0} step="0.01" value={item.unit_cost} onChange={(event) => updateItem(index, { unit_cost: event.target.value })} className="h-9 text-sm" suffix={<span className="px-2 text-xs text-muted">{CURRENCY}</span>} aria-label={t('تكلفة القطعة')} aria-invalid={errors[`items.${index}.unit_cost`] ? 'true' : undefined} />
                                            {errors[`items.${index}.unit_cost`] && <p className="mt-1 text-2xs text-danger">{errors[`items.${index}.unit_cost`]}</p>}
                                        </td>
                                        <td className="px-2 py-2.5">
                                            <Button size="icon" variant="ghost" icon="trash" onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={t('إزالة {name}', { name: itemLabel(item.source) })} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <Field label={t('سبب الإرجاع')} optional error={errors.note}>
                    {(props) => <Textarea {...props} value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} rows={2} placeholder={t('مثال: عيب صناعة')} />}
                </Field>
                <button type="submit" className="hidden" />
            </form>
        </Modal>
    );
}
