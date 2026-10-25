import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Alert, Card, EmptyState } from '@/components/ui/Display';
import { Field, Input, Select, Textarea } from '@/components/ui/Form';
import { Skeleton } from '@/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';
import { itemLabel } from '@/features/inventory/InventoryModals';
import { useWarehouses } from '@/features/inventory/useWarehouses';
import { VariantPicker } from '@/features/inventory/VariantPicker';
import { SupplierFormModal } from '@/features/purchasing/SupplierFormModal';
import { t } from '@/i18n';
import { CURRENCY } from '@/lib/constants';
import { formatMoney, formatNumber } from '@/lib/format';
import { purchaseOrdersApi, suppliersApi } from '@/services/purchasingApi';

/** New or draft purchase order: supplier, expected date, notes and the items with quantities and costs. */
export function PurchaseOrderFormPage() {
    const { purchaseOrderId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const toast = useToast();
    const isEdit = Boolean(purchaseOrderId);
    const [suppliers, setSuppliers] = useState(null);
    const [supplierId, setSupplierId] = useState(searchParams.get('supplier_id') ?? '');
    const [warehouseId, setWarehouseId] = useState('');
    const { warehouses } = useWarehouses();
    const [expectedAt, setExpectedAt] = useState('');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState([]);
    const [errors, setErrors] = useState({});
    const [loadError, setLoadError] = useState(null);
    const [loaded, setLoaded] = useState(!isEdit);
    const [submitting, setSubmitting] = useState(false);
    const [supplierModalOpen, setSupplierModalOpen] = useState(false);

    useEffect(() => {
        suppliersApi
            .list()
            .then((response) => setSuppliers(response.data ?? response))
            .catch(() => setSuppliers([]));
    }, []);

    useEffect(() => {
        if (!isEdit) {
            return;
        }

        purchaseOrdersApi
            .get(purchaseOrderId)
            .then((order) => {
                if (!order.can_edit) {
                    navigate(`/dashboard/purchase-orders/${order.purchase_order_id}`, { replace: true });

                    return;
                }

                setSupplierId(String(order.supplier.supplier_id));
                setWarehouseId(order.warehouse ? String(order.warehouse.warehouse_id) : '');
                setExpectedAt(order.expected_at ?? '');
                setNotes(order.notes ?? '');
                setItems(order.items.map((item) => ({ variant_id: item.variant_id, label: item.variant_title ? `${item.product_name} — ${item.variant_title}` : item.product_name, sku: item.sku, quantity: String(item.quantity_ordered), unit_cost: String(item.unit_cost) })));
                setLoaded(true);
            })
            .catch((error) => setLoadError(error.message));
    }, [isEdit, purchaseOrderId, navigate]);

    const updateItem = (index, patch) => setItems((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
    const total = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_cost) || 0), 0);

    const submit = async (event) => {
        event.preventDefault();

        const nextErrors = {};

        if (!supplierId) {
            nextErrors.supplier_id = t('اختر المورد');
        }

        if (items.length === 0) {
            nextErrors.items = t('أضف صنفاً واحداً على الأقل');
        }

        items.forEach((item, index) => {
            if (!(Number(item.quantity) >= 1) || !Number.isInteger(Number(item.quantity))) {
                nextErrors[`items.${index}.quantity`] = t('أدخل كمية لا تقل عن 1');
            }

            if (item.unit_cost === '' || Number(item.unit_cost) < 0) {
                nextErrors[`items.${index}.unit_cost`] = t('أدخل التكلفة');
            }
        });

        setErrors(nextErrors);

        if (Object.keys(nextErrors).length) {
            return;
        }

        setSubmitting(true);

        try {
            const payload = {
                supplier_id: Number(supplierId),
                warehouse_id: warehouseId ? Number(warehouseId) : null,
                expected_at: expectedAt || null,
                notes: notes.trim() || null,
                items: items.map((item) => ({ variant_id: item.variant_id, quantity: Number(item.quantity), unit_cost: Number(item.unit_cost) })),
            };
            const saved = isEdit ? await purchaseOrdersApi.update(purchaseOrderId, payload) : await purchaseOrdersApi.create(payload);

            toast.success(isEdit ? t('تم حفظ أمر الشراء') : t('تم إنشاء أمر الشراء #{number}', { number: saved.number }));
            navigate(`/dashboard/purchase-orders/${saved.purchase_order_id}`);
        } catch (error) {
            setErrors(error.errors ?? {});
            toast.error(t('تعذر حفظ أمر الشراء'), error.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loadError) {
        return <EmptyState icon="alert-triangle" title={t('تعذر تحميل أمر الشراء')} description={loadError} action={<Button variant="secondary" to="/dashboard/purchase-orders">{t('العودة لأوامر الشراء')}</Button>} />;
    }

    if (!loaded) {
        return <Skeleton className="h-96 w-full rounded-xl" />;
    }

    return (
        <>
            <PageHeader title={isEdit ? t('تعديل أمر الشراء') : t('أمر شراء جديد')} breadcrumbs={[t('لوحة التحكم'), t('أوامر الشراء'), isEdit ? t('تعديل') : t('جديد')]} />

            <form onSubmit={submit} noValidate className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
                <Card title={t('الأصناف')} description={t('الكمية المطلوبة وتكلفة القطعة المتفق عليها مع المورد')} className="lg:col-span-2">
                    <div className="flex flex-col gap-4">
                        <VariantPicker
                            excludedIds={items.map((item) => item.variant_id)}
                            onPick={(item) => {
                                setItems((current) => [...current, { variant_id: item.variant_id, label: itemLabel(item), sku: item.sku, quantity: '', unit_cost: item.cost == null ? '' : String(item.cost) }]);
                                setErrors((current) => ({ ...current, items: undefined }));
                            }}
                        />
                        {errors.items && <Alert tone="danger">{errors.items}</Alert>}

                        {items.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-line-strong p-6 text-center text-sm text-muted">{t('ابحث عن المنتجات وأضفها لأمر الشراء.')}</p>
                        ) : (
                            <div className="mk-scroll overflow-x-auto">
                                <table className="w-full min-w-[560px] text-sm">
                                    <thead className="text-xs text-muted">
                                        <tr>
                                            <th className="px-2 py-2 text-start font-medium">{t('المنتج')}</th>
                                            <th className="w-28 px-2 py-2 text-start font-medium">{t('الكمية')}</th>
                                            <th className="w-36 px-2 py-2 text-start font-medium">{t('تكلفة القطعة')}</th>
                                            <th className="px-2 py-2 text-start font-medium">{t('الإجمالي')}</th>
                                            <th className="w-10" />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-line">
                                        {items.map((item, index) => (
                                            <tr key={item.variant_id}>
                                                <td className="px-2 py-2.5">
                                                    <span className="block font-medium text-ink">{item.label}</span>
                                                    {item.sku && <span className="ltr text-xs text-muted">{item.sku}</span>}
                                                    {errors[`items.${index}.variant_id`] && <p className="text-[11px] text-danger">{errors[`items.${index}.variant_id`]}</p>}
                                                </td>
                                                <td className="px-2 py-2.5 align-top">
                                                    <Input type="number" inputMode="numeric" min={1} step={1} value={item.quantity} onChange={(event) => updateItem(index, { quantity: event.target.value })} className="h-9 text-sm" aria-label={t('الكمية')} aria-invalid={errors[`items.${index}.quantity`] ? 'true' : undefined} />
                                                    {errors[`items.${index}.quantity`] && <p className="mt-1 text-[11px] text-danger">{errors[`items.${index}.quantity`]}</p>}
                                                </td>
                                                <td className="px-2 py-2.5 align-top">
                                                    <Input type="number" inputMode="decimal" min={0} step="0.01" value={item.unit_cost} onChange={(event) => updateItem(index, { unit_cost: event.target.value })} className="h-9 text-sm" suffix={<span className="px-2 text-xs text-muted">{CURRENCY}</span>} aria-label={t('تكلفة القطعة')} aria-invalid={errors[`items.${index}.unit_cost`] ? 'true' : undefined} />
                                                    {errors[`items.${index}.unit_cost`] && <p className="mt-1 text-[11px] text-danger">{errors[`items.${index}.unit_cost`]}</p>}
                                                </td>
                                                <td className="px-2 py-2.5 font-semibold whitespace-nowrap text-ink">{formatMoney((Number(item.quantity) || 0) * (Number(item.unit_cost) || 0))}</td>
                                                <td className="px-2 py-2.5">
                                                    <Button size="icon" variant="ghost" icon="trash" onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={t('إزالة {name}', { name: item.label })} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </Card>

                <div className="flex flex-col gap-6 lg:sticky lg:top-24">
                    <Card title={t('بيانات الأمر')}>
                        <div className="flex flex-col gap-4">
                            <Field
                                label={t('المورد')}
                                required
                                error={errors.supplier_id}
                                action={
                                    <button type="button" onClick={() => setSupplierModalOpen(true)} className="text-xs font-medium text-primary hover:underline">
                                        {t('+ مورد جديد')}
                                    </button>
                                }
                            >
                                {(props) => (
                                    <Select
                                        {...props}
                                        value={supplierId}
                                        onChange={(event) => setSupplierId(event.target.value)}
                                        placeholder={suppliers === null ? t('جارِ التحميل...') : t('اختر المورد')}
                                        options={(suppliers ?? []).map((supplier) => ({ value: String(supplier.supplier_id), label: supplier.name }))}
                                        aria-invalid={errors.supplier_id ? 'true' : undefined}
                                    />
                                )}
                            </Field>
                            {warehouses?.length > 1 && (
                                <Field label={t('مخزن الاستلام')} error={errors.warehouse_id} hint={t('البضاعة المستلمة تُضاف لهذا المخزن.')}>
                                    {(props) => (
                                        <Select
                                            {...props}
                                            value={warehouseId || String(warehouses[0].warehouse_id)}
                                            onChange={(event) => setWarehouseId(event.target.value)}
                                            options={warehouses.map((warehouse) => ({ value: String(warehouse.warehouse_id), label: warehouse.name }))}
                                        />
                                    )}
                                </Field>
                            )}
                            <Field label={t('تاريخ الوصول المتوقع')} optional error={errors.expected_at}>
                                {(props) => <Input {...props} type="date" value={expectedAt} onChange={(event) => setExpectedAt(event.target.value)} />}
                            </Field>
                            <Field label={t('ملاحظات')} optional error={errors.notes}>
                                {(props) => <Textarea {...props} value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} placeholder={t('مثال: الدفع عند الاستلام')} />}
                            </Field>
                        </div>
                    </Card>

                    <Card>
                        <div className="flex items-center justify-between text-sm text-muted">
                            <span>{t('{count} صنف · {units} قطعة', { count: formatNumber(items.length), units: formatNumber(items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)) })}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                            <span className="font-semibold text-ink">{t('إجمالي الأمر')}</span>
                            <span className="mk-num text-xl font-semibold text-ink">{formatMoney(total)}</span>
                        </div>
                        <Button type="submit" loading={submitting} icon="check" className="mt-4 w-full">
                            {isEdit ? t('حفظ التعديلات') : t('حفظ كمسودة')}
                        </Button>
                        <Button variant="secondary" className="mt-2 w-full" onClick={() => navigate(-1)} disabled={submitting}>
                            {t('إلغاء')}
                        </Button>
                    </Card>
                </div>
            </form>

            <SupplierFormModal
                open={supplierModalOpen}
                supplier={null}
                onClose={() => setSupplierModalOpen(false)}
                onSaved={(supplier) => {
                    setSuppliers((current) => [...(current ?? []), supplier].sort((a, b) => a.name.localeCompare(b.name)));
                    setSupplierId(String(supplier.supplier_id));
                    setSupplierModalOpen(false);
                }}
            />
        </>
    );
}
