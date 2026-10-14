import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Overlay';
import { useToast } from '@/context/ToastContext';
import { BILLING_METHODS, PERIODS, priceFor } from '@/features/billing/billing';
import { t } from '@/i18n';
import { adminApi } from '@/services/adminApi';

/** Records a payment taken directly (cash, transfer) and activates or renews a store's plan. */
export function ActivateSubscriptionModal({ store, plans, onClose, onSaved }) {
    const toast = useToast();
    const paidPlans = plans;
    const [values, setValues] = useState({ plan_id: '', months: 1, amount: '', method: 'vodafone_cash', reference: '', notes: '' });
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (store) {
            const plan = paidPlans.find((item) => item.plan_id === store.billing?.plan?.plan_id) ?? paidPlans[0];

            setValues({ plan_id: plan?.plan_id ?? '', months: 1, amount: plan ? priceFor(plan, 1) : '', method: 'vodafone_cash', reference: '', notes: '' });
            setErrors({});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [store]);

    if (!store) {
        return null;
    }

    // Changing the plan or period suggests its price; the admin can still type another amount.
    const set = (key, value) => {
        setValues((current) => {
            const next = { ...current, [key]: value };
            const plan = paidPlans.find((item) => item.plan_id === Number(next.plan_id));

            return key === 'plan_id' || key === 'months' ? { ...next, amount: plan ? priceFor(plan, Number(next.months)) : next.amount } : next;
        });
        setErrors((current) => ({ ...current, [key]: undefined }));
    };

    const submit = async (event) => {
        event.preventDefault();
        setSubmitting(true);

        try {
            const updated = await adminApi.activate(store.store_id, { ...values, plan_id: Number(values.plan_id), months: Number(values.months), amount: Number(values.amount), reference: values.reference || null, notes: values.notes || null });

            toast.success(t('تم تفعيل الاشتراك'));
            onSaved(updated);
        } catch (error) {
            setErrors(error.errors ?? {});
            toast.error(t('تعذر تفعيل الاشتراك'), error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal open onClose={onClose} dismissible={!submitting} icon="zap" title={t('تفعيل اشتراك {name}', { name: store.name })}>
            <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
                <Field label={t('الباقة')} required error={errors.plan_id}>
                    {(props) => <Select {...props} value={values.plan_id} onChange={(event) => set('plan_id', event.target.value)} options={paidPlans.map((plan) => ({ value: plan.plan_id, label: plan.name }))} />}
                </Field>
                <Field label={t('المدة')} required error={errors.months}>
                    {(props) => <Select {...props} value={values.months} onChange={(event) => set('months', event.target.value)} options={PERIODS} />}
                </Field>
                <Field label={t('المبلغ المدفوع')} required error={errors.amount}>
                    {(props) => <Input {...props} type="number" min="0" step="0.01" value={values.amount} onChange={(event) => set('amount', event.target.value)} dir="ltr" className="text-start" />}
                </Field>
                <Field label={t('طريقة الدفع')} required error={errors.method}>
                    {(props) => <Select {...props} value={values.method} onChange={(event) => set('method', event.target.value)} options={Object.entries(BILLING_METHODS).map(([value, label]) => ({ value, label }))} />}
                </Field>
                <Field label={t('رقم العملية')} optional error={errors.reference} className="sm:col-span-2">
                    {(props) => <Input {...props} value={values.reference} onChange={(event) => set('reference', event.target.value)} dir="ltr" className="text-start" maxLength={100} />}
                </Field>
                <Field label={t('ملاحظات')} optional error={errors.notes} className="sm:col-span-2">
                    {(props) => <Textarea {...props} value={values.notes} onChange={(event) => set('notes', event.target.value)} maxLength={500} />}
                </Field>
                <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>
                        {t('إلغاء')}
                    </Button>
                    <Button type="submit" loading={submitting} icon="check" disabled={!values.plan_id}>
                        {t('تفعيل')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
