import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthHeading, AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { useForm } from '@/hooks/useForm';
import { isEmail, isPhone, rules } from '@/lib/validators';
import { authApi } from '@/services/authApi';

const schema = {
    identifier: [
        rules.required('أدخل البريد الإلكتروني أو رقم الهاتف'),
        (value) => (value && !isEmail(value) && !isPhone(value) ? 'أدخل بريداً إلكترونياً صحيحاً أو رقم هاتف صحيح' : null),
    ],
};

export function ForgotPasswordPage() {
    const location = useLocation();
    const [result, setResult] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const { values, errors, setErrors, bind, validateFields } = useForm({ identifier: location.state?.identifier ?? '' }, schema);

    const onSubmit = async (event) => {
        event.preventDefault();

        if (!validateFields()) {
            return;
        }

        setSubmitting(true);

        try {
            setResult(await authApi.forgotPassword(values.identifier));
        } catch (error) {
            setErrors({ identifier: error.errors?.identifier ?? error.message });
        } finally {
            setSubmitting(false);
        }
    };

    if (result) {
        return (
            <AuthLayout>
                <div className="animate-pop text-center">
                    <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-success-soft text-success">
                        <Icon name={result.channel === 'email' ? 'mail' : 'phone'} className="size-8" />
                    </span>
                    <h1 className="mt-6 text-2xl font-bold text-ink">تحقق من {result.channel === 'email' ? 'بريدك الإلكتروني' : 'رسائل الواتساب'}</h1>
                    <p className="mt-3 text-sm leading-relaxed text-muted">
                        {result.message}
                        <br />
                        أرسلنا التعليمات إلى <span className="ltr font-semibold text-ink">{values.identifier}</span>
                    </p>
                    <div className="mt-8 flex flex-col gap-3">
                        <Button to="/login" size="lg" className="w-full" icon="arrow-right">
                            العودة لتسجيل الدخول
                        </Button>
                        <button type="button" onClick={() => setResult(null)} className="text-sm text-primary hover:underline">
                            لم تصلك الرسالة؟ أعد الإرسال
                        </button>
                    </div>
                </div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout>
            <span className="mb-6 grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary">
                <Icon name="lock" className="size-7" />
            </span>
            <AuthHeading title="نسيت كلمة المرور؟" subtitle="لا تقلق، أدخل بريدك الإلكتروني أو رقم هاتفك المسجل وسنرسل لك رابطاً لإعادة تعيين كلمة المرور." />

            <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
                <Field label="البريد الإلكتروني أو رقم الهاتف" error={errors.identifier} required>
                    {(props) => <Input {...props} {...bind('identifier')} icon="mail" dir="ltr" className="text-start" autoComplete="username" placeholder="name@example.com" autoFocus />}
                </Field>
                <Button type="submit" size="lg" loading={submitting} className="w-full">
                    إرسال رابط إعادة التعيين
                </Button>
            </form>

            <Link to="/login" className="mt-8 flex items-center justify-center gap-2 text-sm font-medium text-muted hover:text-primary">
                <Icon name="arrow-right" className="size-4" />
                العودة لتسجيل الدخول
            </Link>
        </AuthLayout>
    );
}
