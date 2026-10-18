import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthHeading, AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Display';
import { Field, Input, PasswordInput } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { useForm } from '@/hooks/useForm';
import { t } from '@/i18n';
import { isEmail, rules } from '@/lib/validators';
import { authApi } from '@/services/authApi';

const INITIAL_VALUES = { password: '', password_confirmation: '' };

const schema = {
    password: [rules.required(t('أدخل كلمة المرور الجديدة')), rules.password()],
    password_confirmation: [rules.required(t('أعد كتابة كلمة المرور')), rules.matches('password')],
};

function StatusScreen({ icon, tone, title, children, actions }) {
    const tones = { success: 'bg-success-soft text-success', danger: 'bg-danger-soft text-danger' };

    return (
        <AuthLayout>
            <div className="animate-pop text-center">
                <span className={`mx-auto grid size-16 place-items-center rounded-2xl ${tones[tone]}`}>
                    <Icon name={icon} className="size-8" />
                </span>
                <h1 className="mt-6 text-2xl font-bold text-ink">{title}</h1>
                <p className="mt-3 text-sm leading-relaxed text-muted">{children}</p>
                <div className="mt-8 flex flex-col gap-3">{actions}</div>
            </div>
        </AuthLayout>
    );
}

/**
 * Target of the emailed reset link: /reset-password?token=…&email=…
 * On success every existing session is revoked server-side, so the vendor signs in again.
 */
export function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') ?? '';
    const email = searchParams.get('email') ?? '';
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);
    const [linkError, setLinkError] = useState(null);
    const { errors, setErrors, bind, validateFields, values } = useForm(INITIAL_VALUES, schema);

    const requestNewLink = (
        <Button to="/forgot-password" state={{ identifier: email }} size="lg" className="w-full" icon="refresh">
            {t('طلب رابط جديد')}
        </Button>
    );

    if (!token || !isEmail(email)) {
        return (
            <StatusScreen
                icon="alert-triangle"
                tone="danger"
                title={t('رابط غير مكتمل')}
                actions={requestNewLink}
            >
                {t('يبدو أن رابط إعادة التعيين ناقص أو تم نسخه بشكل غير صحيح. افتح الرابط من الرسالة مباشرة، أو اطلب رابطاً جديداً.')}
            </StatusScreen>
        );
    }

    if (done) {
        return (
            <StatusScreen
                icon="check-circle"
                tone="success"
                title={t('تم تغيير كلمة المرور')}
                actions={
                    <Button to="/login" state={{ identifier: email }} size="lg" className="w-full" icon="log-in">
                        {t('تسجيل الدخول')}
                    </Button>
                }
            >
                {t('تم تحديث كلمة مرور حسابك بنجاح، وتم تسجيل الخروج من جميع الأجهزة الأخرى لحمايتك.')}
            </StatusScreen>
        );
    }

    const onSubmit = async (event) => {
        event.preventDefault();
        setLinkError(null);

        if (!validateFields()) {
            return;
        }

        setSubmitting(true);

        try {
            await authApi.resetPassword({ token, email, ...values });
            setDone(true);
        } catch (error) {
            const { email: emailError, ...fieldErrors } = error.errors ?? {};

            // An "email" error means the token is invalid or expired, not a form mistake.
            setLinkError(emailError ?? (Object.keys(fieldErrors).length ? null : error.message));
            setErrors(fieldErrors);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AuthLayout>
            <span className="mb-6 grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary">
                <Icon name="shield-check" className="size-7" />
            </span>
            <AuthHeading title={t('تعيين كلمة مرور جديدة')} subtitle={t('اختر كلمة مرور قوية لم تستخدمها من قبل لحسابك على Sellygrow.')} />

            <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
                {linkError && (
                    <Alert tone="danger" title={linkError}>
                        <Link to="/forgot-password" state={{ identifier: email }} className="mt-1 inline-block font-semibold underline underline-offset-4">
                            {t('اطلب رابطاً جديداً')}
                        </Link>
                    </Alert>
                )}

                <Field label={t('البريد الإلكتروني')}>
                    {(props) => <Input {...props} value={email} readOnly icon="mail" dir="ltr" className="cursor-not-allowed bg-surface-2 text-start text-ink-2" autoComplete="username" />}
                </Field>
                <Field label={t('كلمة المرور الجديدة')} error={errors.password} required>
                    {(props) => <PasswordInput {...props} {...bind('password')} showStrength placeholder={t('٨ أحرف على الأقل')} autoFocus />}
                </Field>
                <Field label={t('تأكيد كلمة المرور')} error={errors.password_confirmation} required>
                    {(props) => <PasswordInput {...props} {...bind('password_confirmation')} placeholder={t('أعد كتابة كلمة المرور')} />}
                </Field>

                <Button type="submit" size="lg" loading={submitting} className="w-full">
                    {submitting ? t('جارٍ الحفظ...') : t('حفظ كلمة المرور')}
                </Button>
            </form>

            <Link to="/login" className="mt-8 flex items-center justify-center gap-2 text-sm font-medium text-muted hover:text-primary">
                <Icon name="arrow-right" className="size-4" />
                {t('العودة لتسجيل الدخول')}
            </Link>
        </AuthLayout>
    );
}
