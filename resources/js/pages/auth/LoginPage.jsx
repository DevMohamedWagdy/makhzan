import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthHeading, AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Display';
import { Checkbox, Field, Input, PasswordInput } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useForm } from '@/hooks/useForm';
import { isEmail, isPhone, rules } from '@/lib/validators';
import { DEMO_CREDENTIALS } from '@/services/mock/data';

const IS_MOCK = import.meta.env.VITE_USE_MOCK_API !== 'false';

const schema = {
    identifier: [
        rules.required('أدخل البريد الإلكتروني أو رقم الهاتف'),
        (value) => (value && !isEmail(value) && !isPhone(value) ? 'أدخل بريداً إلكترونياً صحيحاً أو رقم هاتف صحيح' : null),
    ],
    password: [rules.required('أدخل كلمة المرور')],
};

export function LoginPage() {
    const { login } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    const location = useLocation();
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState(null);
    const { values, errors, bind, setValues, setField, validateFields } = useForm({ identifier: location.state?.identifier ?? '', password: '', remember: true }, schema);

    const onSubmit = async (event) => {
        event.preventDefault();
        setFormError(null);

        if (!validateFields()) {
            return;
        }

        setSubmitting(true);

        try {
            const vendor = await login(values);

            toast.success(`أهلاً بعودتك يا ${vendor.full_name.split(' ')[0]} 👋`, 'تم تسجيل الدخول بنجاح');
            navigate(location.state?.from ?? '/dashboard/affiliates', { replace: true });
        } catch (error) {
            setFormError(error.errors?.identifier ?? error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AuthLayout>
            <AuthHeading title="تسجيل الدخول" subtitle="أهلاً بك من جديد! سجّل دخولك لمتابعة إدارة متجرك." />

            <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
                {formError && <Alert tone="danger">{formError}</Alert>}

                <Field label="البريد الإلكتروني أو رقم الهاتف" error={errors.identifier} required>
                    {(props) => <Input {...props} {...bind('identifier')} icon="user" dir="ltr" className="text-start" autoComplete="username" placeholder="name@example.com" />}
                </Field>

                <Field
                    label="كلمة المرور"
                    error={errors.password}
                    required
                    action={
                        <Link to="/forgot-password" state={{ identifier: values.identifier }} className="text-xs font-medium text-primary hover:underline">
                            نسيت كلمة المرور؟
                        </Link>
                    }
                >
                    {(props) => <PasswordInput {...props} {...bind('password')} autoComplete="current-password" placeholder="••••••••" />}
                </Field>

                <Checkbox label="تذكرني على هذا الجهاز" checked={values.remember} onChange={(event) => setField('remember', event.target.checked)} />

                <Button type="submit" size="lg" loading={submitting} className="w-full">
                    {submitting ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}
                </Button>

                {IS_MOCK && (
                    <button
                        type="button"
                        onClick={() => setValues({ ...DEMO_CREDENTIALS, remember: true })}
                        className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong px-4 py-3 text-xs text-ink-2 transition hover:border-primary hover:text-primary"
                    >
                        <Icon name="zap" className="size-4" />
                        تعبئة بيانات الحساب التجريبي
                    </button>
                )}
            </form>

            <p className="mt-8 text-center text-sm text-muted">
                ليس لديك حساب بعد؟{' '}
                <Link to="/register" className="font-semibold text-primary hover:underline">
                    أنشئ متجرك مجاناً
                </Link>
            </p>
        </AuthLayout>
    );
}
