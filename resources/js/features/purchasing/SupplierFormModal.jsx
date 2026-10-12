import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Overlay';
import { useToast } from '@/context/ToastContext';
import { t } from '@/i18n';
import { suppliersApi } from '@/services/purchasingApi';

const EMPTY = { name: '', contact_name: '', phone: '', email: '', address: '', notes: '' };

/** Add or edit a supplier; `supplier` null means a new one. Calls onSaved with the saved supplier. */
export function SupplierFormModal({ open, supplier, onClose, onSaved }) {
    const toast = useToast();
    const [values, setValues] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            setValues(supplier ? Object.fromEntries(Object.keys(EMPTY).map((key) => [key, supplier[key] ?? ''])) : EMPTY);
            setErrors({});
        }
    }, [open, supplier]);

    const bind = (key) => ({
        value: values[key],
        onChange: (event) => {
            setValues((current) => ({ ...current, [key]: event.target.value }));
            setErrors((current) => ({ ...current, [key]: undefined }));
        },
        'aria-invalid': errors[key] ? 'true' : undefined,
    });

    const submit = async (event) => {
        event.preventDefault();

        if (!values.name.trim()) {
            setErrors({ name: t('أدخل اسم المورد') });

            return;
        }

        setSubmitting(true);

        try {
            const payload = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim() || null]));
            const saved = supplier ? await suppliersApi.update(supplier.supplier_id, payload) : await suppliersApi.create(payload);

            toast.success(supplier ? t('تم حفظ المورد') : t('تمت إضافة المورد'));
            onSaved(saved);
        } catch (error) {
            setErrors(error.errors ?? {});
            toast.error(t('تعذر حفظ المورد'), error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal open={open} onClose={onClose} dismissible={!submitting} icon="building" title={supplier ? t('تعديل المورد') : t('مورد جديد')}>
            <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
                <Field label={t('اسم المورد')} required error={errors.name} className="sm:col-span-2">
                    {(props) => <Input {...props} {...bind('name')} data-autofocus maxLength={120} placeholder={t('مثال: مصنع النور للملابس')} />}
                </Field>
                <Field label={t('اسم المسؤول')} optional error={errors.contact_name}>
                    {(props) => <Input {...props} {...bind('contact_name')} maxLength={120} />}
                </Field>
                <Field label={t('الهاتف')} optional error={errors.phone}>
                    {(props) => <Input {...props} {...bind('phone')} dir="ltr" className="text-start" maxLength={20} inputMode="tel" />}
                </Field>
                <Field label={t('البريد')} optional error={errors.email} className="sm:col-span-2">
                    {(props) => <Input {...props} {...bind('email')} dir="ltr" className="text-start" type="email" />}
                </Field>
                <Field label={t('العنوان')} optional error={errors.address} className="sm:col-span-2">
                    {(props) => <Input {...props} {...bind('address')} maxLength={255} />}
                </Field>
                <Field label={t('ملاحظات')} optional error={errors.notes} className="sm:col-span-2">
                    {(props) => <Textarea {...props} {...bind('notes')} maxLength={500} placeholder={t('مثال: مواعيد التسليم، شروط الدفع')} />}
                </Field>
                <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>
                        {t('إلغاء')}
                    </Button>
                    <Button type="submit" loading={submitting} icon="check">
                        {t('حفظ المورد')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
