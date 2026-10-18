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

/** Who carries the order: the vendor records the shipping company and its tracking number. */
export function ShipmentSection({ order, onUpdated }) {
    const toast = useToast();
    const { copy, copiedValue } = useCopy();
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
                        {shipment.updated_at && <DetailRow label={t('آخر تحديث')}>{formatRelative(shipment.updated_at)}</DetailRow>}
                    </dl>
                </>
            ) : (
                <div className="flex flex-wrap gap-2">
                    <Button
                        size="sm"
                        icon="truck"
                        onClick={() => {
                            setManual({ carrier: '', tracking_number: '' });
                            setManualErrors({});
                            setManualOpen(true);
                        }}
                    >
                        {t('إضافة رقم التتبع')}
                    </Button>
                </div>
            )}

            <Modal open={manualOpen} onClose={() => setManualOpen(false)} dismissible={!saving} icon="truck" title={t('رقم التتبع')} description={t('يظهر للعميل في صفحة طلبه.')}>
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
