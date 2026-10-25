import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Display';
import { Field, Input, PasswordInput } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { useStorefront } from '@/features/storefront/StorefrontLayout';
import { useForm } from '@/hooks/useForm';
import { t } from '@/i18n';
import { isEmail, isPhone, rules } from '@/lib/validators';
import { customerApi } from '@/services/customerApi';

const forgotSchema = {
    identifier: [
        rules.required(t('أدخل رقم الهاتف أو البريد الإلكتروني')),
        (value) => (value && !isEmail(value) && !isPhone(value) ? t('أدخل رقم هاتف أو بريداً إلكترونياً صحيحاً') : null),
    ],
};

const resetSchema = {
    password: [rules.required(t('أدخل كلمة المرور الجديدة')), rules.password()],
    password_confirmation: [rules.required(t('أعد كتابة كلمة المرور')), rules.matches('password')],
};

function usePageTitle(title) {
    const { store } = useStorefront();

    useEffect(() => {
        if (store) {
            document.title = `${title} | ${store.name}`;
        }
    }, [store, title]);
}

function PasswordCard({ icon, title, subtitle, children }) {
    return (
        <div className="mx-auto w-full max-w-md">
            <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8">
                <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
                    <Icon name={icon} className="size-6" />
                </span>
                <h1 className="mt-5 mk-page-title">{title}</h1>
                {subtitle && <p className="mt-2 text-sm leading-relaxed text-muted">{subtitle}</p>}
                {children}
            </div>
        </div>
    );
}

/** /{store}/account/forgot-password: emails a reset link to shoppers who registered with an email. */
export function StoreForgotPasswordPage() {
    const { storeSlug } = useParams();
    const location = useLocation();
    const { store } = useStorefront();
    const api = useMemo(() => customerApi(storeSlug), [storeSlug]);
    const [result, setResult] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState(null);
    const { values, errors, bind, validateFields } = useForm({ identifier: location.state?.identifier ?? '' }, forgotSchema);
    const loginPath = `/${storeSlug}/account/login`;

    usePageTitle(t('نسيت كلمة المرور'));

    if (result) {
        return (
            <PasswordCard icon="mail" title={t('تحقق من بريدك الإلكتروني')} subtitle={result.message}>
                <Alert tone="info" className="mt-5">
                    {t('إذا سجّلت برقم هاتف فقط دون بريد إلكتروني، تواصل مع {value} ليعيّن لك كلمة مرور جديدة.', { value: store?.name ?? t('المتجر') })}
                </Alert>
                <div className="mt-6 flex flex-col items-center gap-3">
                    <Button to={loginPath} size="lg" className="w-full" icon="arrow-right">
                        {t('العودة لتسجيل الدخول')}
                    </Button>
                    <button type="button" onClick={() => setResult(null)} className="text-sm text-primary hover:underline">
                        {t('لم تصلك الرسالة؟ أعد المحاولة')}
                    </button>
                </div>
            </PasswordCard>
        );
    }

    const onSubmit = async (event) => {
        event.preventDefault();
        setFormError(null);

        if (!validateFields()) {
            return;
        }

        setSubmitting(true);

        try {
            setResult(await api.forgotPassword(values.identifier));
        } catch (error) {
            setFormError(error.status === 429 ? t('محاولات كثيرة، انتظر دقيقة ثم حاول مرة أخرى.') : (error.errors?.identifier ?? error.message));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <PasswordCard icon="lock" title={t('نسيت كلمة المرور؟')} subtitle={t('أدخل رقم هاتفك أو بريدك الإلكتروني المسجل، وسنرسل رابط إعادة التعيين إلى بريدك.')}>
            <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
                {formError && <Alert tone="danger">{formError}</Alert>}
                <Field label={t('رقم الهاتف أو البريد الإلكتروني')} error={errors.identifier} required>
                    {(props) => <Input {...props} {...bind('identifier')} data-autofocus dir="ltr" className="text-start" autoComplete="username" placeholder="01012345678" />}
                </Field>
                <Button type="submit" size="lg" loading={submitting} className="w-full">
                    {t('إرسال رابط إعادة التعيين')}
                </Button>
            </form>

            <Link to={loginPath} className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-muted hover:text-primary">
                <Icon name="arrow-right" className="size-4" />
                {t('العودة لتسجيل الدخول')}
            </Link>
        </PasswordCard>
    );
}

/**
 * Target of the emailed link: /{store}/account/reset-password?id=…&token=…
 * On success the shopper is signed out everywhere and logs in again.
 */
export function StoreResetPasswordPage() {
    const { storeSlug } = useParams();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') ?? '';
    const customerId = Number(searchParams.get('id'));
    const api = useMemo(() => customerApi(storeSlug), [storeSlug]);
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);
    const [linkError, setLinkError] = useState(null);
    const { values, errors, setErrors, bind, validateFields } = useForm({ password: '', password_confirmation: '' }, resetSchema);
    const loginPath = `/${storeSlug}/account/login`;
    const forgotPath = `/${storeSlug}/account/forgot-password`;

    usePageTitle(t('تعيين كلمة مرور جديدة'));

    if (!token || !Number.isInteger(customerId) || customerId <= 0) {
        return (
            <PasswordCard icon="alert-triangle" title={t('رابط غير مكتمل')} subtitle={t('يبدو أن رابط إعادة التعيين ناقص أو تم نسخه بشكل غير صحيح. افتح الرابط من الرسالة مباشرة، أو اطلب رابطاً جديداً.')}>
                <Button to={forgotPath} size="lg" className="mt-6 w-full" icon="refresh">
                    {t('طلب رابط جديد')}
                </Button>
            </PasswordCard>
        );
    }

    if (done) {
        return (
            <PasswordCard icon="check-circle" title={t('تم تعيين كلمة المرور')} subtitle={t('أصبحت كلمة مرورك الجديدة جاهزة، وتم تسجيل الخروج من جميع الأجهزة الأخرى لحمايتك.')}>
                <Button to={loginPath} size="lg" className="mt-6 w-full" icon="log-in">
                    {t('تسجيل الدخول')}
                </Button>
            </PasswordCard>
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
            await api.resetPassword({ customer_id: customerId, token, ...values });
            setDone(true);
        } catch (error) {
            const { token: tokenError, ...fieldErrors } = error.errors ?? {};

            // A token error means the link is invalid or expired, not a form mistake.
            setLinkError(tokenError ?? (Object.keys(fieldErrors).length ? null : error.message));
            setErrors(fieldErrors);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <PasswordCard icon="shield-check" title={t('تعيين كلمة مرور جديدة')} subtitle={t('اختر كلمة مرور قوية لحسابك.')}>
            <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
                {linkError && (
                    <Alert tone="danger" title={linkError}>
                        <Link to={forgotPath} className="mt-1 inline-block font-semibold underline underline-offset-4">
                            {t('اطلب رابطاً جديداً')}
                        </Link>
                    </Alert>
                )}
                <Field label={t('كلمة المرور الجديدة')} error={errors.password} required>
                    {(props) => <PasswordInput {...props} {...bind('password')} data-autofocus showStrength placeholder={t('٨ أحرف على الأقل')} autoComplete="new-password" />}
                </Field>
                <Field label={t('تأكيد كلمة المرور')} error={errors.password_confirmation} required>
                    {(props) => <PasswordInput {...props} {...bind('password_confirmation')} placeholder={t('أعد كتابة كلمة المرور')} autoComplete="new-password" />}
                </Field>
                <Button type="submit" size="lg" loading={submitting} className="w-full">
                    {submitting ? t('جارٍ الحفظ...') : t('حفظ كلمة المرور')}
                </Button>
            </form>
        </PasswordCard>
    );
}
