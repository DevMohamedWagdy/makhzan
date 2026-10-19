import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { StorePublicLayout } from '@/components/layout/StorePublicLayout';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Display';
import { Field, Input } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { StoreNotFound, StoreStatusScreen } from '@/features/affiliate-portal/StoreStatusScreen';
import { useStoreBySlug } from '@/features/affiliate-portal/useStoreBySlug';
import { useForm } from '@/hooks/useForm';
import { t } from '@/i18n';
import { isEmail, rules } from '@/lib/validators';
import { affiliatePortalApi } from '@/services/affiliatePortalApi';

const schema = {
    email: [rules.required(t('أدخل البريد الإلكتروني')), (value) => (value && !isEmail(value) ? t('أدخل بريداً إلكترونياً صحيحاً') : null)],
};

/**
 * /{store-slug}/affiliates/forgot-password. Links go by email only; affiliates registered
 * with a phone number alone are told to contact the store.
 */
export function AffiliateForgotPasswordPage() {
    const { storeSlug } = useParams();
    const location = useLocation();
    const { store, missing } = useStoreBySlug(storeSlug, t('نسيت كلمة المرور'));
    const [result, setResult] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState(null);
    const { values, errors, bind, validateFields } = useForm({ email: location.state?.email ?? '' }, schema);
    const loginPath = `/${storeSlug}/affiliates/login`;

    if (missing) {
        return <StoreNotFound />;
    }

    if (result) {
        return (
            <StoreStatusScreen
                store={store}
                icon="mail"
                tone="success"
                title={t('تحقق من بريدك الإلكتروني')}
                actions={
                    <>
                        <Button to={loginPath} state={{ email: values.email }} size="lg" className="w-full" icon="arrow-right">
                            {t('العودة لتسجيل الدخول')}
                        </Button>
                        <button type="button" onClick={() => setResult(null)} className="text-sm text-primary hover:underline">
                            {t('لم تصلك الرسالة؟ أعد المحاولة')}
                        </button>
                    </>
                }
            >
                <p>{result.message}</p>
            </StoreStatusScreen>
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
            setResult(await affiliatePortalApi.forgotPassword({ store_slug: storeSlug, email: values.email }));
        } catch (error) {
            setFormError(error.status === 429 ? t('محاولات كثيرة، انتظر دقيقة ثم حاول مرة أخرى.') : (error.errors?.email ?? error.message));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <StorePublicLayout store={store} narrow>
            <div className="mb-8 text-center">
                <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary">
                    <Icon name="lock" className="size-7" />
                </span>
                <h1 className="mt-5 text-2xl font-bold text-ink">{t('نسيت كلمة المرور؟')}</h1>
                <p className="mt-2 text-sm leading-relaxed text-muted">{t('أدخل بريدك الإلكتروني المسجل، وسنرسل لك رابط إعادة التعيين.')}</p>
            </div>

            <form onSubmit={onSubmit} noValidate className="mk-card flex flex-col gap-5 p-6">
                {formError && <Alert tone="danger">{formError}</Alert>}
                <Field label={t('البريد الإلكتروني')} error={errors.email} required>
                    {(props) => <Input {...props} {...bind('email')} type="email" icon="mail" dir="ltr" className="text-start" autoComplete="username" placeholder="name@example.com" autoFocus />}
                </Field>
                <Button type="submit" size="lg" loading={submitting} disabled={!store} className="w-full">
                    {t('إرسال رابط إعادة التعيين')}
                </Button>
            </form>

            <Link to={loginPath} className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-muted hover:text-primary">
                <Icon name="arrow-right" className="size-4" />
                {t('العودة لتسجيل الدخول')}
            </Link>
        </StorePublicLayout>
    );
}
