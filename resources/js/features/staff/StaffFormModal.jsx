import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, Input, PasswordInput, Select, Switch } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Overlay';
import { useToast } from '@/context/ToastContext';
import { t } from '@/i18n';
import { staffApi } from '@/services/staffApi';

const EMPTY = { full_name: '', phone: '', email: '', password: '', role_id: '', is_active: true };

/** Add or edit a team member; `member` null means a new one. Calls onSaved with the saved member. */
export function StaffFormModal({ open, member, roles, onClose, onSaved }) {
    const toast = useToast();
    const [values, setValues] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            setValues(member ? { ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map((key) => [key, member[key] ?? EMPTY[key]])), role_id: member.role?.role_id ?? '', password: '' } : { ...EMPTY, role_id: roles[0]?.role_id ?? '' });
            setErrors({});
        }
    }, [open, member, roles]);

    const set = (key, value) => {
        setValues((current) => ({ ...current, [key]: value }));
        setErrors((current) => ({ ...current, [key]: undefined }));
    };

    const bind = (key) => ({
        value: values[key],
        onChange: (event) => set(key, event.target.value),
        'aria-invalid': errors[key] ? 'true' : undefined,
    });

    const submit = async (event) => {
        event.preventDefault();
        setSubmitting(true);

        try {
            const payload = { ...values, role_id: Number(values.role_id), password: values.password || null };
            const saved = member ? await staffApi.update(member.staff_id, payload) : await staffApi.create(payload);

            toast.success(member ? t('تم حفظ بيانات الموظف') : t('تمت إضافة الموظف'), member ? undefined : t('شارك معه رقم الهاتف وكلمة المرور ليسجّل الدخول.'));
            onSaved(saved);
        } catch (error) {
            setErrors(error.errors ?? {});
            toast.error(t('تعذر حفظ الموظف'), error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal open={open} onClose={onClose} dismissible={!submitting} size="lg" icon="user-plus" title={member ? t('تعديل الموظف') : t('موظف جديد')}>
            <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
                <Field label={t('الاسم بالكامل')} required error={errors.full_name} className="sm:col-span-2">
                    {(props) => <Input {...props} {...bind('full_name')} data-autofocus maxLength={255} />}
                </Field>
                <Field label={t('رقم الهاتف')} required error={errors.phone}>
                    {(props) => <Input {...props} {...bind('phone')} type="tel" dir="ltr" className="text-start" placeholder="01012345678" />}
                </Field>
                <Field label={t('البريد الإلكتروني')} required error={errors.email}>
                    {(props) => <Input {...props} {...bind('email')} type="email" dir="ltr" className="text-start" />}
                </Field>
                <Field label={member ? t('كلمة مرور جديدة') : t('كلمة المرور')} required={!member} optional={Boolean(member)} hint={member ? t('اتركها فارغة للإبقاء على كلمة المرور الحالية') : undefined} error={errors.password} className="sm:col-span-2">
                    {(props) => <PasswordInput {...props} {...bind('password')} showStrength autoComplete="new-password" placeholder={t('٨ أحرف على الأقل')} />}
                </Field>

                <Field label={t('الدور')} required error={errors.role_id} hint={roles.length === 0 ? t('أضف دوراً أولاً من تبويب الأدوار.') : undefined} className="sm:col-span-2">
                    {(props) => <Select {...props} value={values.role_id} onChange={(event) => set('role_id', event.target.value)} options={roles.map((role) => ({ value: role.role_id, label: role.name }))} placeholder={t('اختر الدور')} />}
                </Field>

                {member && (
                    <div className="sm:col-span-2">
                        <Switch checked={values.is_active} onChange={(checked) => set('is_active', checked)} label={t('الحساب مفعّل')} description={t('إيقاف الحساب يسجّل خروج الموظف فوراً ويمنعه من الدخول.')} />
                    </div>
                )}

                <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>
                        {t('إلغاء')}
                    </Button>
                    <Button type="submit" loading={submitting} icon="check">
                        {member ? t('حفظ التعديلات') : t('إضافة الموظف')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
