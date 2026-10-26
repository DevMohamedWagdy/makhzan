import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Display';
import { Checkbox, Field, Input, PasswordInput } from '@/components/ui/Form';
import { useToast } from '@/context/ToastContext';
import { useCustomerAuth } from '@/features/storefront/CustomerAuthContext';
import { useStorefront } from '@/features/storefront/StorefrontLayout';
import { t } from '@/i18n';

/** Shopper sign-in (/account/login) and sign-up (/account/register); `?next=` returns after. */
export function StoreAuthPage({ mode }) {
    const { storeSlug } = useParams();
    const { store } = useStorefront();
    const { isAuthenticated, login, register } = useCustomerAuth();
    const navigate = useNavigate();
    const toast = useToast();
    const [searchParams] = useSearchParams();
    const next = `/${storeSlug}/${searchParams.get('next') ?? 'account/orders'}`;
    const [values, setValues] = useState({ full_name: '', phone: '', email: '', identifier: '', password: '', password_confirmation: '', remember: true });
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const isRegister = mode === 'register';

    useEffect(() => {
        if (store) {
            document.title = `${isRegister ? t('إنشاء حساب') : t('تسجيل الدخول')} | ${store.name}`;
        }
    }, [store, isRegister]);

    if (isAuthenticated && !submitting) {
        return <Navigate to={next} replace />;
    }

    const set = (field) => (event) => {
        setValues((current) => ({ ...current, [field]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));
        setErrors((current) => ({ ...current, [field]: undefined, form: undefined }));
    };

    const submit = async (event) => {
        event.preventDefault();
        setSubmitting(true);

        try {
            const customer = isRegister
                ? await register({ full_name: values.full_name, phone: values.phone, email: values.email || null, password: values.password, password_confirmation: values.password_confirmation })
                : await login({ identifier: values.identifier, password: values.password, remember: values.remember });

            toast.success(isRegister ? t('تم إنشاء حسابك') : t('أهلاً بعودتك يا {value} 👋', { value: customer.full_name.split(' ')[0] }));
            navigate(next, { replace: true });
        } catch (error) {
            setErrors(error.errors && Object.keys(error.errors).length ? error.errors : { form: error.message });
            setSubmitting(false);
        }
    };

    const query = searchParams.toString() ? `?${searchParams}` : '';

    return (
        <div className="mx-auto w-full max-w-md">
            <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8">
                <h1 className="mk-page-title">{isRegister ? t('إنشاء حساب جديد') : t('تسجيل الدخول')}</h1>
                <p className="mt-2 text-sm text-muted">{isRegister ? t('أنشئ حسابك في {name} لإتمام طلبك ومتابعته.', { name: store?.name ?? '' }) : t('سجّل دخولك لإتمام طلبك ومتابعة طلباتك.')}</p>

                <form onSubmit={submit} noValidate className="mt-6 flex flex-col gap-4">
                    {errors.form && <Alert tone="danger">{errors.form}</Alert>}
                    {isRegister ? (
                        <>
                            <Field label={t('الاسم بالكامل')} required error={errors.full_name}>
                                {(props) => <Input {...props} data-autofocus value={values.full_name} onChange={set('full_name')} autoComplete="name" />}
                            </Field>
                            <Field label={t('رقم الهاتف')} required error={errors.phone}>
                                {(props) => <Input {...props} type="tel" dir="ltr" className="text-start" value={values.phone} onChange={set('phone')} autoComplete="tel" placeholder="01012345678" />}
                            </Field>
                            <Field label={t('البريد الإلكتروني')} optional error={errors.email}>
                                {(props) => <Input {...props} type="email" dir="ltr" className="text-start" value={values.email} onChange={set('email')} autoComplete="email" />}
                            </Field>
                            <Field label={t('كلمة المرور')} required error={errors.password}>
                                {(props) => <PasswordInput {...props} value={values.password} onChange={set('password')} autoComplete="new-password" showStrength placeholder={t('8 أحرف على الأقل')} />}
                            </Field>
                            <Field label={t('تأكيد كلمة المرور')} required error={errors.password_confirmation}>
                                {(props) => <PasswordInput {...props} value={values.password_confirmation} onChange={set('password_confirmation')} autoComplete="new-password" />}
                            </Field>
                        </>
                    ) : (
                        <>
                            <Field label={t('رقم الهاتف أو البريد الإلكتروني')} required error={errors.identifier}>
                                {(props) => <Input {...props} data-autofocus dir="ltr" className="text-start" value={values.identifier} onChange={set('identifier')} autoComplete="username" />}
                            </Field>
                            <Field label={t('كلمة المرور')} required error={errors.password}>
                                {(props) => <PasswordInput {...props} value={values.password} onChange={set('password')} autoComplete="current-password" />}
                            </Field>
                            <div className="flex items-center justify-between gap-3">
                                <Checkbox label={t('تذكرني على هذا الجهاز')} checked={values.remember} onChange={set('remember')} />
                                <Link to={`/${storeSlug}/account/forgot-password`} state={{ identifier: values.identifier }} className="text-sm font-medium text-primary hover:underline">
                                    {t('نسيت كلمة المرور؟')}
                                </Link>
                            </div>
                        </>
                    )}
                    <Button type="submit" size="lg" loading={submitting} className="w-full">
                        {isRegister ? t('إنشاء الحساب') : t('تسجيل الدخول')}
                    </Button>
                </form>

                <p className="mt-6 text-center text-sm text-muted">
                    {isRegister ? t('لديك حساب بالفعل؟ ') : t('ليس لديك حساب؟ ')}
                    <Link to={`/${storeSlug}/account/${isRegister ? 'login' : 'register'}${query}`} className="font-semibold text-primary hover:underline">
                        {isRegister ? t('سجّل دخولك') : t('أنشئ حساباً')}
                    </Link>
                </p>
            </div>
        </div>
    );
}
