import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Display';
import { Field, Input, Select, Switch } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Overlay';
import { useToast } from '@/context/ToastContext';
import { CategoryFormModal } from '@/features/products/CategoryFormModal';
import { OptionsFields } from '@/features/products/VariantsEditor';
import { combinations } from '@/features/products/variants';
import { useCategories } from '@/features/products/useCategories';
import { localized, t } from '@/i18n';
import { CURRENCY, OPTION_NAMES } from '@/lib/constants';
import { formatNumber } from '@/lib/format';
import { productsApi } from '@/services/productsApi';

const MAX_VARIANTS = 100;
const EMPTY_FORM = { name: '', category_id: '', price: '', unit_cost: '', quantity: '' };

/**
 * A product the store doesn't have yet, created from the purchase order: name, category, selling price and,
 * like the product form, sizes or colors entered as option rows with value chips. It's saved as a draft with no stock (receiving the order brings the stock
 * in), and `onCreated(lines)` hands back one order line per variant with the quantity and cost entered here.
 */
export function QuickProductModal({ open, onClose, onCreated }) {
    const toast = useToast();
    const { categories, reload: reloadCategories } = useCategories();
    const [values, setValues] = useState(EMPTY_FORM);
    const [hasOptions, setHasOptions] = useState(false);
    const [options, setOptions] = useState([]);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [categoryModalOpen, setCategoryModalOpen] = useState(false);

    useEffect(() => {
        if (open) {
            setValues(EMPTY_FORM);
            setHasOptions(false);
            setOptions([]);
            setErrors({});
        }
    }, [open]);

    const parsedOptions = useMemo(() => (hasOptions ? options.map((option) => ({ name: option.name.trim(), values: option.values })).filter((option) => option.name && option.values.length) : []), [hasOptions, options]);
    // Without options the product is one variant with no option values.
    const variantRows = parsedOptions.length ? combinations(parsedOptions) : [[]];
    const categoryId = values.category_id || (categories?.[0] ? String(categories[0].category_id) : '');

    const set = (key) => (event) => {
        setValues((current) => ({ ...current, [key]: event.target.value }));
        setErrors((current) => ({ ...current, [key]: undefined }));
    };

    const validate = () => {
        const next = {};

        if (!values.name.trim()) {
            next.name = t('اكتب اسم المنتج');
        }

        if (!categoryId) {
            next.category_id = t('اختر القسم');
        }

        if (values.price === '' || Number(values.price) < 0) {
            next.price = t('أدخل سعر البيع');
        }

        if (values.unit_cost === '' || Number(values.unit_cost) < 0) {
            next.unit_cost = t('أدخل التكلفة');
        }

        if (!(Number(values.quantity) >= 1) || !Number.isInteger(Number(values.quantity))) {
            next.quantity = t('أدخل كمية لا تقل عن 1');
        }

        if (hasOptions && (parsedOptions.length === 0 || options.some((option) => option.name.trim() && option.values.length === 0))) {
            next.options = t('أضف قيمة واحدة على الأقل لكل خيار');
        }

        if (variantRows.length > MAX_VARIANTS) {
            next.options = t('عدد التركيبات أكبر من {max}', { max: MAX_VARIANTS });
        }

        setErrors(next);

        return Object.keys(next).length === 0;
    };

    const submit = async (event) => {
        event.preventDefault();

        if (!validate()) {
            return;
        }

        setSaving(true);

        try {
            const product = await productsApi.create({
                category_id: Number(categoryId),
                name: values.name.trim(),
                status: 'draft',
                is_featured: false,
                options: parsedOptions,
                variants: variantRows.map((optionValues) => ({ option_values: optionValues, price: Number(values.price), stock: 0 })),
            });

            onCreated(
                product.variants.map((variant) => ({
                    variant_id: variant.variant_id,
                    label: variant.title ? `${localized(product)} — ${variant.title}` : localized(product),
                    sku: variant.sku,
                    quantity: String(values.quantity),
                    unit_cost: String(values.unit_cost),
                })),
            );
            toast.success(t('تمت إضافة المنتج كمسودة'), t('«{name}» أُضيف لأمر الشراء ({count} صنف).', { name: localized(product), count: formatNumber(product.variants.length) }));
        } catch (error) {
            setErrors(error.errors ?? {});
            toast.error(t('تعذر إضافة المنتج'), Object.values(error.errors ?? {})[0] ?? error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Modal
                open={open}
                onClose={onClose}
                dismissible={!saving}
                size="lg"
                icon="box"
                title={t('منتج جديد')}
                description={t('يُحفظ كمسودة غير ظاهرة في المتجر، ويدخل مخزونه عند استلام أمر الشراء.')}
                footer={
                    <>
                        <Button variant="secondary" onClick={onClose} disabled={saving}>
                            {t('إلغاء')}
                        </Button>
                        <Button icon="plus" loading={saving} onClick={submit}>
                            {variantRows.length > 1 ? t('إضافة {count} صنف للأمر', { count: formatNumber(variantRows.length) }) : t('إضافة للأمر')}
                        </Button>
                    </>
                }
            >
                <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
                    <Field label={t('اسم المنتج')} required error={errors.name} className="sm:col-span-2">
                        {(props) => <Input {...props} value={values.name} onChange={set('name')} maxLength={150} placeholder={t('مثال: قميص كتان كاجوال')} autoFocus />}
                    </Field>

                    <Field
                        label={t('القسم')}
                        required
                        error={errors.category_id}
                        className="sm:col-span-2"
                        action={
                            <button type="button" onClick={() => setCategoryModalOpen(true)} className="text-xs font-medium text-primary hover:underline">
                                {t('+ قسم جديد')}
                            </button>
                        }
                    >
                        {(props) =>
                            categories?.length === 0 ? (
                                <p className="rounded-lg border border-dashed border-line-strong p-3 text-sm text-muted">{t('لا توجد أقسام بعد. أضف قسماً أولاً.')}</p>
                            ) : (
                                <Select {...props} value={categoryId} onChange={set('category_id')} options={(categories ?? []).map((category) => ({ value: String(category.category_id), label: localized(category) }))} />
                            )
                        }
                    </Field>

                    <Field label={t('سعر البيع')} required error={errors.price}>
                        {(props) => <Input {...props} type="number" inputMode="decimal" min={0} step="0.01" value={values.price} onChange={set('price')} suffix={<span className="px-2 text-xs text-muted">{CURRENCY}</span>} />}
                    </Field>
                    <Field label={t('تكلفة القطعة من المورد')} required error={errors.unit_cost}>
                        {(props) => <Input {...props} type="number" inputMode="decimal" min={0} step="0.01" value={values.unit_cost} onChange={set('unit_cost')} suffix={<span className="px-2 text-xs text-muted">{CURRENCY}</span>} />}
                    </Field>
                    <Field label={variantRows.length > 1 ? t('الكمية لكل صنف') : t('الكمية المطلوبة')} required error={errors.quantity} hint={variantRows.length > 1 ? t('تقدر تعدّل كمية كل صنف في الأمر بعد الإضافة.') : undefined}>
                        {(props) => <Input {...props} type="number" inputMode="numeric" min={1} step={1} value={values.quantity} onChange={set('quantity')} />}
                    </Field>

                    <div className="flex flex-col gap-3 sm:col-span-2">
                        <div className="rounded-xl border border-line bg-surface-2 p-4">
                            <Switch
                                checked={hasOptions}
                                onChange={(enabled) => {
                                    setHasOptions(enabled);
                                    setErrors((current) => ({ ...current, options: undefined }));

                                    if (enabled && options.length === 0) {
                                        setOptions([{ name: OPTION_NAMES.size, values: [] }]);
                                    }
                                }}
                                label={t('المنتج له مقاسات أو ألوان')}
                                description={t('فعّله لإضافة صنف لكل تركيبة، مثل: أسود / L.')}
                            />
                        </div>
                        {hasOptions && (
                            <>
                                <OptionsFields
                                    options={options}
                                    onChange={(next) => {
                                        setOptions(next);
                                        setErrors((current) => ({ ...current, options: undefined }));
                                    }}
                                    errors={errors}
                                />
                                {parsedOptions.length > 0 && (
                                    <div className="rounded-xl border border-line p-3">
                                        <p className="mb-2 text-xs font-medium text-ink-2">{t('سيُضاف {count} صنف للأمر:', { count: formatNumber(variantRows.length) })}</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {variantRows.map((row) => (
                                                <span key={row.join('/')} className="rounded-md bg-surface-3 px-2 py-0.5 text-xs text-ink-2">
                                                    {row.join(' / ')}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                    <button type="submit" className="hidden" />
                </form>
            </Modal>

            <CategoryFormModal
                open={categoryModalOpen}
                onClose={() => setCategoryModalOpen(false)}
                onSaved={async (category) => {
                    setCategoryModalOpen(false);
                    await reloadCategories();
                    setValues((current) => ({ ...current, category_id: String(category.category_id) }));
                }}
            />
        </>
    );
}
