import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthHeading, AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Display';
import { Field, Input, PasswordInput } from '@/components/ui/Form';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useForm } from '@/hooks/useForm';
import { t } from '@/i18n';
import { rules } from '@/lib/validators';

const schema = {
    email: [rules.required(t('أدخل البريد الإلكتروني'))],
    password: [rules.required(t('أدخل كلمة المرور'))],
};

/** /admin/login — platform team only; accounts come from `php artisan makhzan:create-admin`. */
export function AdminLoginPage() {
    const { login } = useAdminAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState(null);
    const { values, errors, bind, validateFields } = useForm({ email: '', password: '' }, schema);

    const onSubmit = async (event) => {
        event.preventDefault();
        setFormError(null);

        if (!validateFields()) {
            return;
        }

        setSubmitting(true);

        try {
            await login(values);
            navigate(location.state?.from ?? '/admin', { replace: true });
        } catch (error) {
            setFormError(error.errors?.email ?? error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AuthLayout>
            <AuthHeading title={t('إدارة المنصة')} subtitle={t('تسجيل دخول فريق Sellygrow لإدارة المتاجر والاشتراكات.')} />

            <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
                {formError && <Alert tone="danger">{formError}</Alert>}
                <Field label={t('البريد الإلكتروني')} error={errors.email} required>
                    {(props) => <Input {...props} {...bind('email')} type="email" icon="mail" dir="ltr" className="text-start" autoComplete="username" />}
                </Field>
                <Field label={t('كلمة المرور')} error={errors.password} required>
                    {(props) => <PasswordInput {...props} {...bind('password')} autoComplete="current-password" placeholder="••••••••" />}
                </Field>
                <Button type="submit" size="lg" loading={submitting} className="w-full">
                    {t('تسجيل الدخول')}
                </Button>
            </form>
        </AuthLayout>
    );
}
