import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Card, DetailRow, EmptyState } from '@/components/ui/Display';
import { Field, Input } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Overlay';
import { Skeleton } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { PurchaseOrderStatusBadge } from '@/features/purchasing/PurchaseOrderBadges';
import { t } from '@/i18n';
import { cn, formatDate, formatMoney, formatNumber } from '@/lib/format';
import { purchaseOrdersApi } from '@/services/purchasingApi';

const itemName = (item) => (item.variant_title ? `${item.product_name} — ${item.variant_title}` : item.product_name);

/** Quantities that arrived now, prefilled with what remains of each item. */
function ReceiveModal({ order, open, onClose, onReceived }) {
    const toast = useToast();
    const [quantities, setQuantities] = useState({});
    const [note, setNote] = useState('');
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const pending = order.items.filter((item) => item.remaining > 0);

    useEffect(() => {
        if (open) {
            setQuantities(Object.fromEntries(pending.map((item) => [item.item_id, String(item.remaining)])));
            setNote('');
            setErrors({});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const units = Object.values(quantities).reduce((sum, value) => sum + (Number(value) || 0), 0);

    const submit = async (event) => {
        event.preventDefault();
        setSubmitting(true);

        try {
            const updated = await purchaseOrdersApi.receive(
                order.purchase_order_id,
                pending.map((item) => ({ item_id: item.item_id, quantity: Number(quantities[item.item_id]) || 0 })),
                note.trim() || null,
            );

            toast.success(t('تم استلام {count} قطعة وإضافتها للمخزون', { count: formatNumber(units) }));
            onReceived(updated);
        } catch (error) {
            setErrors(error.errors ?? {});
            toast.error(t('تعذر تسجيل الاستلام'), error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal open={open} onClose={onClose} dismissible={!submitting} size="lg" icon="download" title={t('استلام بضاعة')} description={t('أدخل الكميات التي وصلت الآن؛ تُضاف للمخزون بتكلفة أمر الشراء.')}>
            <form onSubmit={submit} noValidate className="flex flex-col gap-4">
                {errors.items && <p className="text-sm text-danger">{errors.items}</p>}
                <ul className="divide-y divide-line rounded-xl border border-line">
                    {pending.map((item) => (
                        <li key={item.item_id} className="flex flex-wrap items-center gap-3 p-3">
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-medium text-ink">{itemName(item)}</span>
                                <span className="text-xs text-muted">
                                    {t('المتبقي {remaining} من {ordered}', { remaining: formatNumber(item.remaining), ordered: formatNumber(item.quantity_ordered) })}
                                </span>
                                {errors[`items.${item.item_id}`] && <p className="text-xs text-danger">{errors[`items.${item.item_id}`]}</p>}
                            </span>
                            <Input
                                type="number"
                                inputMode="numeric"
                                min={0}
                                max={item.remaining}
                                step={1}
                                value={quantities[item.item_id] ?? ''}
                                onChange={(event) => setQuantities((current) => ({ ...current, [item.item_id]: event.target.value }))}
                                className="h-9 w-28 text-sm"
                                aria-label={t('الكمية المستلمة من {name}', { name: itemName(item) })}
                            />
                        </li>
                    ))}
                </ul>
                <Field label={t('ملاحظة')} optional>
                    {(props) => <Input {...props} value={note} onChange={(event) => setNote(event.target.value)} maxLength={150} placeholder={t('مثال: الشحنة الأولى')} />}
                </Field>
                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>
                        {t('إلغاء')}
                    </Button>
                    <Button type="submit" loading={submitting} icon="check" disabled={units < 1}>
                        {t('استلام {count} قطعة', { count: formatNumber(units) })}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

const CONFIRMS = {
    order: { title: t('تأكيد إرسال الطلب للمورد؟'), description: t('سيتحول أمر الشراء إلى "بانتظار الاستلام".'), tone: 'primary', icon: 'send', label: t('تأكيد') },
    cancel: { title: t('إلغاء أمر الشراء؟'), description: t('لن تتمكن من الاستلام عليه بعد الإلغاء.'), tone: 'danger', icon: 'x', label: t('إلغاء الأمر') },
    close: { title: t('إغلاق أمر الشراء؟'), description: t('استخدمه عندما لن تصل بقية الكميات. لن تتمكن من الاستلام عليه بعد الإغلاق.'), tone: 'warning', icon: 'lock', label: t('إغلاق') },
    remove: { title: t('حذف المسودة؟'), description: t('سيتم حذف أمر الشراء نهائياً.'), tone: 'danger', icon: 'trash', label: t('حذف') },
};

/** One purchase order: items with received/remaining quantities and its lifecycle actions. */
export function PurchaseOrderPage() {
    const { can } = useAuth();
    const { purchaseOrderId } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const [order, setOrder] = useState(null);
    const [error, setError] = useState(null);
    const [receiving, setReceiving] = useState(false);
    const [confirm, setConfirm] = useState(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(() => {
        setError(null);
        purchaseOrdersApi
            .get(purchaseOrderId)
            .then(setOrder)
            .catch((loadError) => setError(loadError.message));
    }, [purchaseOrderId]);

    useEffect(load, [load]);

    const runConfirmed = async () => {
        setBusy(true);

        try {
            if (confirm === 'remove') {
                await purchaseOrdersApi.remove(order.purchase_order_id);
                toast.success(t('تم حذف المسودة'));
                navigate('/dashboard/purchase-orders');

                return;
            }

            const action = { order: purchaseOrdersApi.markOrdered, cancel: purchaseOrdersApi.cancel, close: purchaseOrdersApi.close }[confirm];

            setOrder(await action(order.purchase_order_id));
            toast.success(t('تم تحديث أمر الشراء'));
            setConfirm(null);
        } catch (actionError) {
            toast.error(t('تعذر تحديث أمر الشراء'), actionError.errors?.status ?? actionError.message);
        } finally {
            setBusy(false);
        }
    };

    if (error) {
        return <EmptyState icon="alert-triangle" title={t('تعذر تحميل أمر الشراء')} description={error} action={<Button variant="secondary" to="/dashboard/purchase-orders">{t('العودة لأوامر الشراء')}</Button>} />;
    }

    if (!order) {
        return <Skeleton className="h-96 w-full rounded-xl" />;
    }

    const progress = order.units_ordered ? Math.round((order.units_received / order.units_ordered) * 100) : 0;
    const confirmConfig = confirm ? CONFIRMS[confirm] : null;

    return (
        <>
            <PageHeader
                title={t('أمر الشراء #{number}', { number: order.number })}
                description={order.supplier.name}
                breadcrumbs={[t('لوحة التحكم'), t('أوامر الشراء'), `#${order.number}`]}
                actions={
                    <>
                        {order.status === 'draft' && can('purchasing.delete') && (
                            <Button variant="danger-soft" icon="trash" onClick={() => setConfirm('remove')}>
                                {t('حذف')}
                            </Button>
                        )}
                        {order.status === 'ordered' && (
                            <Button variant="secondary" icon="x" onClick={() => setConfirm('cancel')}>
                                {t('إلغاء الأمر')}
                            </Button>
                        )}
                        {order.status === 'partial' && (
                            <Button variant="secondary" icon="lock" onClick={() => setConfirm('close')}>
                                {t('إغلاق الأمر')}
                            </Button>
                        )}
                        {order.can_edit && (
                            <Button variant="secondary" icon="edit" to={`/dashboard/purchase-orders/${order.purchase_order_id}/edit`}>
                                {t('تعديل')}
                            </Button>
                        )}
                        {order.status === 'draft' && (
                            <Button variant="secondary" icon="send" onClick={() => setConfirm('order')}>
                                {t('تم الإرسال للمورد')}
                            </Button>
                        )}
                        {order.can_receive && (
                            <Button icon="download" onClick={() => setReceiving(true)}>
                                {t('استلام بضاعة')}
                            </Button>
                        )}
                    </>
                }
            />

            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
                <Card title={t('الأصناف')} className="lg:col-span-2" bodyClassName="p-0">
                    <div className="mk-scroll overflow-x-auto">
                        <table className="w-full min-w-[620px] text-sm">
                            <thead className="mk-thead">
                                <tr>
                                    {[t('المنتج'), t('المطلوب'), t('المستلم'), t('المتبقي'), t('تكلفة القطعة'), t('الإجمالي')].map((column) => (
                                        <th key={column} className="px-4 py-3 text-start font-medium whitespace-nowrap">
                                            {column}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                                {order.items.map((item) => (
                                    <tr key={item.item_id}>
                                        <td className="px-4 py-3">
                                            <span className="block font-medium text-ink">{itemName(item)}</span>
                                            {item.sku && <span className="ltr text-xs text-muted">{item.sku}</span>}
                                        </td>
                                        <td className="px-4 py-3 text-ink-2">{formatNumber(item.quantity_ordered)}</td>
                                        <td className="px-4 py-3 font-semibold text-success">{formatNumber(item.quantity_received)}</td>
                                        <td className={cn('px-4 py-3', item.remaining > 0 ? 'font-semibold text-warning' : 'text-muted')}>{formatNumber(item.remaining)}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-ink-2">{formatMoney(item.unit_cost)}</td>
                                        <td className="px-4 py-3 font-semibold whitespace-nowrap text-ink">{formatMoney(item.line_total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <div className="flex flex-col gap-6 lg:sticky lg:top-24">
                    <Card>
                        <div className="flex items-center justify-between">
                            <PurchaseOrderStatusBadge status={order.status} />
                            <span className="text-sm whitespace-nowrap text-muted">{t('{value}% مستلم', { value: formatNumber(progress) })}</span>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                            <div className="h-full rounded-full bg-success" style={{ width: `${progress}%` }} />
                        </div>
                        <dl className="mt-4 divide-y divide-line">
                            <DetailRow label={t('إجمالي الأمر')}>{formatMoney(order.total)}</DetailRow>
                            <DetailRow label={t('قيمة المستلم')}>{formatMoney(order.received_total)}</DetailRow>
                            <DetailRow label={t('القطع')}>{t('{received} من {ordered}', { received: formatNumber(order.units_received), ordered: formatNumber(order.units_ordered) })}</DetailRow>
                        </dl>
                    </Card>

                    <Card title={t('التفاصيل')}>
                        <dl className="divide-y divide-line">
                            <DetailRow label={t('المورد')}>{order.supplier.name}</DetailRow>
                            {order.warehouse && <DetailRow label={t('مخزن الاستلام')}>{order.warehouse.name}</DetailRow>}
                            {order.supplier.phone && (
                                <DetailRow label={t('الهاتف')} ltr>
                                    {order.supplier.phone}
                                </DetailRow>
                            )}
                            <DetailRow label={t('تاريخ الإنشاء')}>{formatDate(order.created_at)}</DetailRow>
                            {order.ordered_at && <DetailRow label={t('أُرسل للمورد')}>{formatDate(order.ordered_at)}</DetailRow>}
                            {order.expected_at && <DetailRow label={t('الوصول المتوقع')}>{formatDate(order.expected_at)}</DetailRow>}
                            {order.received_at && <DetailRow label={t('اكتمل الاستلام')}>{formatDate(order.received_at)}</DetailRow>}
                            {order.closed_at && <DetailRow label={t('أُغلق')}>{formatDate(order.closed_at)}</DetailRow>}
                            {order.cancelled_at && <DetailRow label={t('أُلغي')}>{formatDate(order.cancelled_at)}</DetailRow>}
                        </dl>
                        {order.notes && <p className="mt-3 rounded-lg bg-surface-2 p-3 text-sm text-ink-2">{order.notes}</p>}
                    </Card>
                </div>
            </div>

            <ReceiveModal
                order={order}
                open={receiving}
                onClose={() => setReceiving(false)}
                onReceived={(updated) => {
                    setOrder(updated);
                    setReceiving(false);
                }}
            />
            <ConfirmDialog
                open={Boolean(confirm)}
                onClose={() => setConfirm(null)}
                onConfirm={runConfirmed}
                loading={busy}
                icon={confirmConfig?.icon}
                tone={confirmConfig?.tone}
                title={confirmConfig?.title}
                description={confirmConfig?.description}
                confirmLabel={confirmConfig?.label}
            />
        </>
    );
}
