import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { DetailRow } from '@/components/ui/Display';
import { Field, Input } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Overlay';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useCopy } from '@/hooks/common';
import { t } from '@/i18n';
import { formatRelative } from '@/lib/format';
import { ordersApi } from '@/services/ordersApi';

/**
 * Opens Bosta's airway bills for the orders in a new tab. The tab opens before the download
 * so the browser doesn't treat it as an unrequested popup.
 */
export async function openAirwayBills(orderIds, toast) {
    const tab = window.open('', '_blank');

    try {
        const pdf = await ordersApi.airwayBills(orderIds);

        tab.location.href = URL.createObjectURL(pdf);
    } catch (error) {
        tab?.close();
        toast.error(t('تعذر طباعة بوالص بوسطة'), error.errors?.ids ?? error.errors?.carrier ?? error.message);
    }
}

/** Who carries the order: ship with Bosta, record another company's tracking number, or track it. */
export function ShipmentSection({ order, onUpdated }) {
    const toast = useToast();
    const { copy, copiedValue } = useCopy();
    const [shipping, setShipping] = useState(false);
    const [manualOpen, setManualOpen] = useState(false);
    const [manual, setManual] = useState({ carrier: '', tracking_number: '' });
    const [manualErrors, setManualErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const { shipment } = order;
    const { can } = useAuth();
    const canShip = ['confirmed', 'shipped'].includes(order.status) && can('orders.update');

    if (!shipment && !canShip) {
        return null;
    }

    const shipWithBosta = async () => {
        setShipping(true);

        try {
            const updated = await ordersApi.shipWithBosta(order.order_id);

            toast.success(t('تم إنشاء شحنة بوسطة'), t('رقم التتبع: {number}', { number: updated.shipment?.tracking_number }));
            onUpdated(updated);
        } catch (error) {
            toast.error(t('تعذر إنشاء الشحنة'), error.errors?.carrier ?? error.errors?.status ?? error.message);
        } finally {
            setShipping(false);
        }
    };

    const saveManual = async (event) => {
        event.preventDefault();
        setSaving(true);

        try {
            onUpdated(await ordersApi.updateTracking(order.order_id, manual.carrier, manual.tracking_number));
            setManualOpen(false);
            toast.success(t('تم حفظ رقم التتبع'));
        } catch (error) {
            setManualErrors(error.errors ?? {});
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className="p-6">
            <h3 className="mb-3 text-sm font-semibold text-ink">{t('الشحن والتتبع')}</h3>

            {shipment ? (
                <>
                    <dl className="divide-y divide-line">
                        <DetailRow label={t('شركة الشحن')}>{shipment.carrier}</DetailRow>
                        <DetailRow label={t('رقم التتبع')}>
                            <button type="button" onClick={() => copy(shipment.tracking_number)} className="ltr font-mono font-semibold text-ink hover:text-primary" title={t('نسخ')}>
                                {copiedValue === shipment.tracking_number ? t('تم النسخ') : shipment.tracking_number}
                            </button>
                        </DetailRow>
                        {shipment.status && (
                            <DetailRow label={t('حالة الشحنة')}>
                                {shipment.status}
                                {shipment.updated_at && <span className="ms-1 text-xs text-muted">({formatRelative(shipment.updated_at)})</span>}
                            </DetailRow>
                        )}
                    </dl>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {shipment.tracking_url && (
                            <Button size="sm" variant="secondary" icon="external-link" onClick={() => window.open(shipment.tracking_url, '_blank', 'noopener')}>
                                {t('تتبع الشحنة')}
                            </Button>
                        )}
                        {shipment.is_bosta && (
                            <Button size="sm" variant="secondary" icon="printer" onClick={() => openAirwayBills([order.order_id], toast)}>
                                {t('طباعة بوليصة بوسطة')}
                            </Button>
                        )}
                    </div>
                </>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {order.status === 'confirmed' && can('orders.ship') && (
                        <Button size="sm" icon="truck" loading={shipping} onClick={shipWithBosta}>
                            {t('شحن مع بوسطة')}
                        </Button>
                    )}
                    <Button
                        size="sm"
                        variant="secondary"
                        icon="edit"
                        onClick={() => {
                            setManual({ carrier: '', tracking_number: '' });
                            setManualErrors({});
                            setManualOpen(true);
                        }}
                    >
                        {t('إضافة رقم تتبع يدوياً')}
                    </Button>
                </div>
            )}

            <Modal open={manualOpen} onClose={() => setManualOpen(false)} dismissible={!saving} icon="truck" title={t('رقم التتبع')} description={t('لشركات الشحن غير المربوطة؛ يظهر للعميل في صفحة طلبه.')}>
                <form onSubmit={saveManual} noValidate className="flex flex-col gap-4">
                    <Field label={t('شركة الشحن')} required error={manualErrors.carrier}>
                        {(props) => <Input {...props} value={manual.carrier} onChange={(event) => setManual((current) => ({ ...current, carrier: event.target.value }))} data-autofocus maxLength={60} placeholder={t('مثال: أرامكس')} />}
                    </Field>
                    <Field label={t('رقم التتبع')} required error={manualErrors.tracking_number}>
                        {(props) => <Input {...props} value={manual.tracking_number} onChange={(event) => setManual((current) => ({ ...current, tracking_number: event.target.value }))} dir="ltr" className="text-start" maxLength={60} />}
                    </Field>
                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setManualOpen(false)} disabled={saving}>
                            {t('إلغاء')}
                        </Button>
                        <Button type="submit" loading={saving} icon="check">
                            {t('حفظ')}
                        </Button>
                    </div>
                </form>
            </Modal>
        </section>
    );
}
