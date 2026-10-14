import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, Input, PasswordInput, Switch } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Overlay';
import { useToast } from '@/context/ToastContext';
import { t } from '@/i18n';
import { adminApi } from '@/services/adminApi';

/** Edit any dashboard account: details, a new password, or turning it off (signs it out). */
export function VendorEditModal({ vendor, onClose, onSaved }) {
    const toast = useToast();
    const [values, setValues] = useState({ full_name: '', phone: '', email: '', password: '', is_active: true });
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (vendor) {
            setValues({ full_name: vendor.full_name, phone: vendor.phone, email: vendor.email, password: '', is_active: vendor.is_active });
            setErrors({});
        }
    }, [vendor]);

    if (!vendor) {
        return null;
    }

    const set = (key, value) => {
        setValues((current) => ({ ...current, [key]: value }));
        setErrors((current) => ({ ...current, [key]: undefined }));
    };

    const submit = async (event) => {
        event.preventDefault();
        setSubmitting(true);

        try {
            const saved = await adminApi.updateVendor(vendor.vendor_id, { ...values, password: values.password || null });

            toast.success(t('تم حفظ الحساب'));
            onSaved(saved);
        } catch (error) {
            setErrors(error.errors ?? {});
            toast.error(t('تعذر حفظ الحساب'), error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal open onClose={onClose} dismissible={!submitting} icon="user" title={t('تعديل حساب {name}', { name: vendor.full_name })}>
            <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
                <Field label={t('الاسم بالكامل')} required error={errors.full_name} className="sm:col-span-2">
                    {(props) => <Input {...props} value={values.full_name} onChange={(event) => set('full_name', event.target.value)} />}
                </Field>
                <Field label={t('رقم الهاتف')} required error={errors.phone}>
                    {(props) => <Input {...props} value={values.phone} onChange={(event) => set('phone', event.target.value)} dir="ltr" className="text-start" />}
                </Field>
                <Field label={t('البريد الإلكتروني')} required error={errors.email}>
                    {(props) => <Input {...props} type="email" value={values.email} onChange={(event) => set('email', event.target.value)} dir="ltr" className="text-start" />}
                </Field>
                <Field label={t('كلمة مرور جديدة')} optional hint={t('اتركها فارغة للإبقاء على كلمة المرور الحالية')} error={errors.password} className="sm:col-span-2">
                    {(props) => <PasswordInput {...props} value={values.password} onChange={(event) => set('password', event.target.value)} autoComplete="new-password" />}
                </Field>
                <div className="sm:col-span-2">
                    <Switch checked={values.is_active} onChange={(checked) => set('is_active', checked)} label={t('الحساب مفعّل')} description={t('إيقاف الحساب يسجّل خروجه فوراً ويمنعه من الدخول.')} />
                </div>
                <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
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
