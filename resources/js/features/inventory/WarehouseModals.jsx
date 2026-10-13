import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Display';
import { Field, Input, Select } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Overlay';
import { useToast } from '@/context/ToastContext';
import { t } from '@/i18n';
import { formatNumber } from '@/lib/format';
import { GOVERNORATES } from '@/lib/locations';
import { transfersApi, warehousesApi } from '@/services/warehousesApi';
import { itemLabel } from './InventoryModals';
import { VariantPicker } from './VariantPicker';

/** Add or edit a warehouse; `warehouse` null means a new one (it goes last in priority). */
export function WarehouseFormModal({ open, warehouse, onClose, onSaved }) {
    const toast = useToast();
    const [values, setValues] = useState({ name: '', address: '', governorate_id: '' });
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            setValues({ name: warehouse?.name ?? '', address: warehouse?.address ?? '', governorate_id: warehouse?.governorate_id ?? '' });
            setErrors({});
        }
    }, [open, warehouse]);

    const submit = async (event) => {
        event.preventDefault();

        if (!values.name.trim()) {
            setErrors({ name: t('أدخل اسم المخزن') });

            return;
        }

        setSubmitting(true);

        try {
            const payload = { name: values.name.trim(), address: values.address.trim() || null, governorate_id: values.governorate_id || null };
            const saved = warehouse ? await warehousesApi.update(warehouse.warehouse_id, payload) : await warehousesApi.create(payload);

            toast.success(warehouse ? t('تم حفظ المخزن') : t('تمت إضافة المخزن'));
            onSaved(saved);
        } catch (error) {
            setErrors(error.errors ?? {});
            toast.error(t('تعذر حفظ المخزن'), error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal open={open} onClose={onClose} dismissible={!submitting} size="sm" icon="building" title={warehouse ? t('تعديل المخزن') : t('مخزن جديد')}>
            <form onSubmit={submit} noValidate className="flex flex-col gap-4">
                <Field label={t('اسم المخزن')} required error={errors.name}>
                    {(props) => <Input {...props} data-autofocus value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} maxLength={100} placeholder={t('مثال: فرع الإسكندرية')} />}
                </Field>
                <Field label={t('المحافظة')} optional error={errors.governorate_id} hint={t('طلبات عملاء هذه المحافظة تُخصم من هذا المخزن أولاً.')}>
                    {(props) => <Select {...props} value={values.governorate_id} onChange={(event) => setValues({ ...values, governorate_id: event.target.value })} placeholder={t('اختر المحافظة')} options={GOVERNORATES.map((governorate) => ({ value: governorate.id, label: governorate.name }))} />}
                </Field>
                <Field label={t('العنوان')} optional error={errors.address}>
                    {(props) => <Input {...props} value={values.address} onChange={(event) => setValues({ ...values, address: event.target.value })} maxLength={255} />}
                </Field>
                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>
                        {t('إلغاء')}
                    </Button>
                    <Button type="submit" loading={submitting} icon="check">
                        {t('حفظ')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

/** The quantity of an inventory item (with its `warehouses` breakdown) in one warehouse. */
export function stockIn(item, warehouseId) {
    return item.warehouses?.find((row) => row.warehouse_id === Number(warehouseId))?.stock ?? 0;
}

/** Move several items from one warehouse to another at once. */
export function TransferModal({ open, warehouses, onClose, onTransferred }) {
    const toast = useToast();
    const [fromId, setFromId] = useState('');
    const [toId, setToId] = useState('');
    const [note, setNote] = useState('');
    const [items, setItems] = useState([]);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            setFromId(warehouses[0] ? String(warehouses[0].warehouse_id) : '');
            setToId(warehouses[1] ? String(warehouses[1].warehouse_id) : '');
            setNote('');
            setItems([]);
            setErrors({});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const options = warehouses.map((warehouse) => ({ value: String(warehouse.warehouse_id), label: warehouse.name }));

    const submit = async (event) => {
        event.preventDefault();

        const nextErrors = {};

        if (!fromId || !toId || fromId === toId) {
            nextErrors.to_warehouse_id = t('اختر مخزنين مختلفين');
        }

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
        });

        setErrors(nextErrors);

        if (Object.keys(nextErrors).length) {
            return;
        }

        setSubmitting(true);

        try {
            const transfer = await transfersApi.create({
                from_warehouse_id: Number(fromId),
                to_warehouse_id: Number(toId),
                note: note.trim() || null,
                items: items.map((item) => ({ variant_id: item.source.variant_id, quantity: Number(item.quantity) })),
            });

            toast.success(t('تم التحويل #{number}', { number: transfer.number }), t('نُقلت {count} قطعة إلى {name}', { count: formatNumber(transfer.units), name: transfer.to_warehouse.name }));
            onTransferred(transfer);
        } catch (error) {
            setErrors(error.errors ?? {});
            toast.error(t('تعذر التحويل'), error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal open={open} onClose={onClose} dismissible={!submitting} size="lg" icon="refresh" title={t('تحويل بين المخازن')} description={t('تُنقل الكميات فوراً، ويُسجل التحويل في سجل الحركات.')}>
            <form onSubmit={submit} noValidate className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t('من مخزن')} required error={errors.from_warehouse_id}>
                        {(props) => <Select {...props} value={fromId} onChange={(event) => setFromId(event.target.value)} options={options} />}
                    </Field>
                    <Field label={t('إلى مخزن')} required error={errors.to_warehouse_id}>
                        {(props) => <Select {...props} value={toId} onChange={(event) => setToId(event.target.value)} options={options} />}
                    </Field>
                </div>

                <VariantPicker
                    excludedIds={items.map((item) => item.source.variant_id)}
                    stockOf={(item) => stockIn(item, fromId)}
                    placeholder={t('ابحث عن منتج لتحويله...')}
                    onPick={(source) => {
                        setItems((current) => [...current, { source, quantity: '' }]);
                        setErrors((current) => ({ ...current, items: undefined }));
                    }}
                />
                {errors.items && <Alert tone="danger">{errors.items}</Alert>}

                {items.length > 0 && (
                    <ul className="divide-y divide-line rounded-xl border border-line">
                        {items.map((item, index) => (
                            <li key={item.source.variant_id} className="flex flex-wrap items-center gap-3 p-3">
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-medium text-ink">{itemLabel(item.source)}</span>
                                    <span className="text-xs text-muted">{t('المتاح في المخزن المحوَّل منه {count}', { count: formatNumber(stockIn(item.source, fromId)) })}</span>
                                    {errors[`items.${index}.quantity`] && <p className="text-xs text-danger">{errors[`items.${index}.quantity`]}</p>}
                                </span>
                                <Input
                                    type="number"
                                    inputMode="numeric"
                                    min={1}
                                    step={1}
                                    value={item.quantity}
                                    onChange={(event) => setItems((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, quantity: event.target.value } : row)))}
                                    className="h-9 w-28 text-sm"
                                    aria-label={t('الكمية المحوَّلة من {name}', { name: itemLabel(item.source) })}
                                />
                                <Button size="icon" variant="ghost" icon="trash" onClick={() => setItems((current) => current.filter((_, rowIndex) => rowIndex !== index))} aria-label={t('إزالة {name}', { name: itemLabel(item.source) })} />
                            </li>
                        ))}
                    </ul>
                )}

                <Field label={t('ملاحظة')} optional>
                    {(props) => <Input {...props} value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} placeholder={t('مثال: تجهيز الفرع لموسم العيد')} />}
                </Field>

                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>
                        {t('إلغاء')}
                    </Button>
                    <Button type="submit" loading={submitting} icon="check">
                        {t('تحويل الآن')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
