import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthHeading, AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Display';
import { Checkbox, Field, Input, PasswordInput } from '@/components/ui/Form';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useForm } from '@/hooks/useForm';
import { t } from '@/i18n';
import { isEmail, rules } from '@/lib/validators';

const schema = {
    email: [rules.required(t('أدخل البريد الإلكتروني')), (value) => (value && !isEmail(value) ? t('أدخل بريداً إلكترونياً صحيحاً') : null)],
    password: [rules.required(t('أدخل كلمة المرور'))],
};

export function LoginPage() {
    const { login } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    const location = useLocation();
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState(null);
    const { values, errors, bind, setField, validateFields } = useForm({ email: location.state?.email ?? '', password: '', remember: false }, schema);

    const onSubmit = async (event) => {
        event.preventDefault();
        setFormError(null);

        if (!validateFields()) {
            return;
        }

        setSubmitting(true);

        try {
            const { vendor, verification } = await login(values);

            if (verification) {
                navigate('/verify-email', { state: { verification, from: location.state?.from } });

                return;
            }

            toast.success(t('أهلاً بعودتك يا {value} 👋', { value: vendor.full_name.split(' ')[0] }), t('تم تسجيل الدخول بنجاح'));
            navigate(location.state?.from ?? '/dashboard', { replace: true });
        } catch (error) {
            setFormError(error.errors?.email ?? error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AuthLayout>
            <AuthHeading title={t('تسجيل الدخول')} subtitle={t('أهلاً بك من جديد! سجّل دخولك لمتابعة إدارة متجرك.')} />

            <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
                {formError && <Alert tone="danger">{formError}</Alert>}

                <Field label={t('البريد الإلكتروني')} error={errors.email} required>
                    {(props) => <Input {...props} {...bind('email')} type="email" icon="mail" dir="ltr" className="text-start" autoComplete="username" placeholder="name@example.com" />}
                </Field>

                <Field
                    label={t('كلمة المرور')}
                    error={errors.password}
                    required
                    action={
                        <Link to="/forgot-password" state={{ email: values.email }} className="text-xs font-medium text-primary hover:underline">
                            {t('نسيت كلمة المرور؟')}
                        </Link>
                    }
                >
                    {(props) => <PasswordInput {...props} {...bind('password')} autoComplete="current-password" placeholder="••••••••" />}
                </Field>

                <Checkbox label={t('تذكرني على هذا الجهاز')} checked={values.remember} onChange={(event) => setField('remember', event.target.checked)} />

                <Button type="submit" size="lg" loading={submitting} className="w-full">
                    {submitting ? t('جارٍ تسجيل الدخول...') : t('تسجيل الدخول')}
                </Button>

            </form>

            <p className="mt-8 text-center text-sm text-muted">
                {t('ليس لديك حساب بعد؟ ')}
                <Link to="/register" className="font-semibold text-primary hover:underline">
                    {t('أنشئ متجرك مجاناً')}
                </Link>
            </p>
        </AuthLayout>
    );
}
