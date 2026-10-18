import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, Input, OptionCards, Select, Textarea } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Overlay';
import { useToast } from '@/context/ToastContext';
import { localized, t } from '@/i18n';
import { CURRENCY } from '@/lib/constants';
import { formatMoney, formatNumber } from '@/lib/format';
import { inventoryApi } from '@/services/inventoryApi';

const MOVEMENT_OPTIONS = [
    { value: 'restock', label: t('توريد'), icon: 'download', description: t('وصلت بضاعة جديدة') },
    { value: 'adjustment', label: t('تسوية جرد'), icon: 'check-circle', description: t('العدد الفعلي مختلف') },
    { value: 'damage', label: t('تالف أو مفقود'), icon: 'alert-triangle', description: t('خصم من المخزون') },
];

/** "فستان — أحمر / L" */
export function itemLabel(item) {
    return item.variant_title ? `${localized(item, 'product_name')} — ${item.variant_title}` : localized(item, 'product_name');
}

const numberOrNull = (value) => (value === '' || value == null ? null : Number(value));

/**
 * Restock, stock count or write-off for one variant in one warehouse, with a preview of the
 * warehouse's resulting stock. The warehouse choice shows only when the store has several.
 */
export function StockMovementModal({ item, initialType = 'restock', onClose, onSaved }) {
    const toast = useToast();
    const [type, setType] = useState(initialType);
    const [warehouseId, setWarehouseId] = useState('');
    const [quantity, setQuantity] = useState('');
    const [unitCost, setUnitCost] = useState('');
    const [note, setNote] = useState('');
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (item) {
            const first = item.warehouses?.[0];

            setType(initialType);
            setWarehouseId(first ? String(first.warehouse_id) : '');
            setQuantity(initialType === 'adjustment' ? String(first?.stock ?? item.stock) : '');
            setUnitCost(item.cost == null ? '' : String(item.cost));
            setNote('');
            setErrors({});
        }
    }, [item, initialType]);

    if (!item) {
        return null;
    }

    const warehouses = item.warehouses ?? [];
    const current = warehouses.length ? (warehouses.find((row) => String(row.warehouse_id) === warehouseId)?.stock ?? 0) : item.stock;
    const amount = Number(quantity) || 0;
    const after = type === 'restock' ? current + amount : type === 'damage' ? current - amount : amount;

    const chooseType = (value) => {
        setType(value);
        setQuantity(value === 'adjustment' ? String(current) : '');
        setErrors({});
    };

    const chooseWarehouse = (value) => {
        setWarehouseId(value);

        if (type === 'adjustment') {
            setQuantity(String(warehouses.find((row) => String(row.warehouse_id) === value)?.stock ?? 0));
        }
    };

    const submit = async (event) => {
        event.preventDefault();

        if (quantity === '' || !Number.isInteger(Number(quantity)) || Number(quantity) < (type === 'adjustment' ? 0 : 1)) {
            setErrors({ quantity: type === 'adjustment' ? t('أدخل الكمية المعدودة') : t('أدخل كمية لا تقل عن 1') });

            return;
        }

        if (type === 'damage' && amount > current) {
            setErrors({ quantity: t('الكمية أكبر من المخزون الحالي ({count})', { count: formatNumber(current) }) });

            return;
        }

        setSubmitting(true);

        try {
            const { movement, item: updated } = await inventoryApi.recordMovement(item.variant_id, {
                type,
                quantity: amount,
                warehouse_id: warehouseId ? Number(warehouseId) : undefined,
                unit_cost: type === 'restock' ? numberOrNull(unitCost) : null,
                note: note.trim() || null,
            });

            toast.success(movement ? t('تم تسجيل الحركة') : t('لا يوجد فرق في الجرد'), t('المخزون الآن {count}', { count: formatNumber(updated.stock) }));
            onSaved(updated);
        } catch (error) {
            setErrors(error.errors && Object.keys(error.errors).length ? error.errors : { quantity: error.message });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal open onClose={onClose} dismissible={!submitting} icon="warehouse" title={t('حركة مخزون')} description={itemLabel(item)}>
            <form onSubmit={submit} noValidate className="flex flex-col gap-4">
                <OptionCards options={MOVEMENT_OPTIONS} value={type} onChange={chooseType} name="movement-type" />

                {warehouses.length > 1 && (
                    <Field label={t('المخزن')} required error={errors.warehouse_id}>
                        {(props) => (
                            <Select
                                {...props}
                                value={warehouseId}
                                onChange={(event) => chooseWarehouse(event.target.value)}
                                options={warehouses.map((row) => ({ value: String(row.warehouse_id), label: t('{name} ({count} قطعة)', { name: row.name, count: formatNumber(row.stock) }) }))}
                            />
                        )}
                    </Field>
                )}

                <Field
                    label={type === 'adjustment' ? t('الكمية المعدودة فعلياً') : type === 'restock' ? t('الكمية الواردة') : t('الكمية التالفة أو المفقودة')}
                    required
                    error={errors.quantity}
                    hint={t('المخزون الحالي {current} ← بعد الحركة {after}', { current: formatNumber(current), after: formatNumber(Math.max(after, 0)) })}
                >
                    {(props) => (
                        <Input
                            {...props}
                            data-autofocus
                            type="number"
                            inputMode="numeric"
                            min={type === 'adjustment' ? 0 : 1}
                            step={1}
                            value={quantity}
                            onChange={(event) => {
                                setQuantity(event.target.value);
                                setErrors({});
                            }}
                            aria-invalid={errors.quantity ? 'true' : undefined}
                        />
                    )}
                </Field>

                {type === 'restock' && (
                    <Field label={t('تكلفة القطعة في هذه الشحنة')} optional error={errors.unit_cost} hint={item.cost != null ? t('تُحسب التكلفة الجديدة كمتوسط مرجّح مع التكلفة الحالية ({value}).', { value: formatMoney(item.cost) }) : t('تُحفظ كتكلفة للمنتج لحساب الأرباح.')}>
                        {(props) => <Input {...props} type="number" inputMode="decimal" min={0} step="0.01" value={unitCost} onChange={(event) => setUnitCost(event.target.value)} suffix={<span className="px-2 text-sm text-muted">{CURRENCY}</span>} />}
                    </Field>
                )}

                <Field label={t('ملاحظة')} optional error={errors.note}>
                    {(props) => <Textarea {...props} value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} placeholder={type === 'restock' ? t('مثال: فاتورة المورد رقم 125') : t('مثال: جرد نهاية الشهر')} />}
                </Field>

                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>
                        {t('إلغاء')}
                    </Button>
                    <Button type="submit" loading={submitting} icon="check">
                        {t('تسجيل الحركة')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

/** Purchase cost and this variant's own low-stock threshold. */
export function EditItemModal({ item, storeThreshold, onClose, onSaved }) {
    const toast = useToast();
    const [cost, setCost] = useState('');
    const [threshold, setThreshold] = useState('');
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (item) {
            setCost(item.cost == null ? '' : String(item.cost));
            setThreshold(item.low_stock_threshold == null ? '' : String(item.low_stock_threshold));
            setErrors({});
        }
    }, [item]);

    if (!item) {
        return null;
    }

    const margin = cost !== '' && item.price > 0 ? Math.round(((item.price - Number(cost)) / item.price) * 1000) / 10 : null;

    const submit = async (event) => {
        event.preventDefault();
        setSubmitting(true);

        try {
            const updated = await inventoryApi.updateItem(item.variant_id, { cost: numberOrNull(cost), low_stock_threshold: numberOrNull(threshold) });

            toast.success(t('تم حفظ بيانات المخزون'));
            onSaved(updated);
        } catch (error) {
            setErrors(error.errors ?? {});
            toast.error(t('تعذر الحفظ'), error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal open onClose={onClose} dismissible={!submitting} size="sm" icon="edit" title={t('التكلفة وحد التنبيه')} description={itemLabel(item)}>
            <form onSubmit={submit} noValidate className="flex flex-col gap-4">
                <Field label={t('تكلفة القطعة')} optional error={errors.cost} hint={margin === null ? t('سعر البيع {price}', { price: formatMoney(item.price) }) : t('سعر البيع {price} · هامش الربح {margin}%', { price: formatMoney(item.price), margin: formatNumber(margin) })}>
                    {(props) => <Input {...props} data-autofocus type="number" inputMode="decimal" min={0} step="0.01" value={cost} onChange={(event) => setCost(event.target.value)} suffix={<span className="px-2 text-sm text-muted">{CURRENCY}</span>} />}
                </Field>
                <Field label={t('حد التنبيه لهذا المنتج')} optional error={errors.low_stock_threshold} hint={t('اتركه فارغاً لاستخدام حد المتجر ({count} قطع).', { count: formatNumber(storeThreshold) })}>
                    {(props) => <Input {...props} type="number" inputMode="numeric" min={0} step={1} value={threshold} onChange={(event) => setThreshold(event.target.value)} placeholder={String(storeThreshold)} />}
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

/** The store-wide low-stock threshold. */
export function InventorySettingsModal({ open, threshold, onClose, onSaved }) {
    const toast = useToast();
    const [value, setValue] = useState('');
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            setValue(String(threshold ?? 5));
            setError(null);
        }
    }, [open, threshold]);

    const submit = async (event) => {
        event.preventDefault();

        if (value === '' || Number(value) < 0 || !Number.isInteger(Number(value))) {
            setError(t('أدخل رقماً صحيحاً'));

            return;
        }

        setSubmitting(true);

        try {
            const result = await inventoryApi.updateSettings({ low_stock_threshold: Number(value) });

            toast.success(t('تم حفظ إعدادات المخزون'));
            onSaved(result.low_stock_threshold);
        } catch (saveError) {
            setError(saveError.errors?.low_stock_threshold ?? saveError.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal open={open} onClose={onClose} dismissible={!submitting} size="sm" icon="settings" title={t('إعدادات المخزون')} description={t('يصلك تنبيه عندما يصل مخزون أي منتج لهذا الحد أو ينفد.')}>
            <form onSubmit={submit} noValidate className="flex flex-col gap-4">
                <Field label={t('حد المخزون المنخفض')} required error={error} hint={t('يمكنك تحديد حد مختلف لأي منتج من زر "التكلفة وحد التنبيه".')}>
                    {(props) => <Input {...props} data-autofocus type="number" inputMode="numeric" min={0} step={1} value={value} onChange={(event) => setValue(event.target.value)} suffix={<span className="px-2 text-sm text-muted">{t('قطع')}</span>} />}
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
