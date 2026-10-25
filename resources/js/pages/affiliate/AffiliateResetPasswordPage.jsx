import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { StorePublicLayout } from '@/components/layout/StorePublicLayout';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Display';
import { Field, PasswordInput } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { StoreNotFound, StoreStatusScreen } from '@/features/affiliate-portal/StoreStatusScreen';
import { useStoreBySlug } from '@/features/affiliate-portal/useStoreBySlug';
import { useForm } from '@/hooks/useForm';
import { t } from '@/i18n';
import { rules } from '@/lib/validators';
import { affiliatePortalApi } from '@/services/affiliatePortalApi';

const schema = {
    password: [rules.required(t('أدخل كلمة المرور الجديدة')), rules.password()],
    password_confirmation: [rules.required(t('أعد كتابة كلمة المرور')), rules.matches('password')],
};

/**
 * Target of the emailed link: /{store-slug}/affiliates/reset-password?id=…&token=…
 * On success the affiliate is signed out everywhere and logs in again.
 */
export function AffiliateResetPasswordPage() {
    const { storeSlug } = useParams();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') ?? '';
    const affiliateId = Number(searchParams.get('id'));
    const { store, missing } = useStoreBySlug(storeSlug, t('تعيين كلمة مرور جديدة'));
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);
    const [linkError, setLinkError] = useState(null);
    const { values, errors, setErrors, bind, validateFields } = useForm({ password: '', password_confirmation: '' }, schema);
    const loginPath = `/${storeSlug}/affiliates/login`;
    const forgotPath = `/${storeSlug}/affiliates/forgot-password`;

    if (missing) {
        return <StoreNotFound />;
    }

    if (!token || !Number.isInteger(affiliateId) || affiliateId <= 0) {
        return (
            <StoreStatusScreen store={store} icon="alert-triangle" tone="danger" title={t('رابط غير مكتمل')} actions={<Button to={forgotPath} size="lg" className="w-full" icon="refresh">{t('طلب رابط جديد')}</Button>}>
                {t('يبدو أن رابط إعادة التعيين ناقص أو تم نسخه بشكل غير صحيح. افتح الرابط من الرسالة مباشرة، أو اطلب رابطاً جديداً.')}
            </StoreStatusScreen>
        );
    }

    if (done) {
        return (
            <StoreStatusScreen store={store} icon="check-circle" tone="success" title={t('تم تعيين كلمة المرور')} actions={<Button to={loginPath} size="lg" className="w-full" icon="log-in">{t('تسجيل الدخول')}</Button>}>
                {t('أصبحت كلمة مرورك الجديدة جاهزة، وتم تسجيل الخروج من جميع الأجهزة الأخرى لحمايتك.')}
            </StoreStatusScreen>
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
            await affiliatePortalApi.resetPassword({ store_slug: storeSlug, affiliate_id: affiliateId, token, ...values });
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
        <StorePublicLayout store={store} narrow>
            <div className="mb-8 text-center">
                <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary">
                    <Icon name="shield-check" className="size-7" />
                </span>
                <h1 className="mt-5 mk-page-title">{t('تعيين كلمة مرور جديدة')}</h1>
                <p className="mt-2 text-sm text-muted">{t('{value}', { value: t('اختر كلمة مرور قوية لحسابك كمسوق{value}.', { value: store ? t(' في {name}', { name: store.name }) : '' }) })}</p>
            </div>

            <form onSubmit={onSubmit} noValidate className="mk-card flex flex-col gap-5 p-6">
                {linkError && (
                    <Alert tone="danger" title={linkError}>
                        <Link to={forgotPath} className="mt-1 inline-block font-semibold underline underline-offset-4">
                            {t('اطلب رابطاً جديداً')}
                        </Link>
                    </Alert>
                )}
                <Field label={t('كلمة المرور الجديدة')} error={errors.password} required>
                    {(props) => <PasswordInput {...props} {...bind('password')} showStrength placeholder={t('٨ أحرف على الأقل')} autoFocus />}
                </Field>
                <Field label={t('تأكيد كلمة المرور')} error={errors.password_confirmation} required>
                    {(props) => <PasswordInput {...props} {...bind('password_confirmation')} placeholder={t('أعد كتابة كلمة المرور')} />}
                </Field>
                <Button type="submit" size="lg" loading={submitting} disabled={!store} className="w-full">
                    {submitting ? t('جارٍ الحفظ...') : t('حفظ كلمة المرور')}
                </Button>
            </form>

            <Link to={loginPath} className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-muted hover:text-primary">
                <Icon name="arrow-right" className="size-4" />
                {t('العودة لتسجيل الدخول')}
            </Link>
        </StorePublicLayout>
    );
}
