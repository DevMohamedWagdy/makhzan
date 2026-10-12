import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { StorePublicLayout } from '@/components/layout/StorePublicLayout';
import { Button } from '@/components/ui/Button';
import { Alert, Avatar } from '@/components/ui/Display';
import { Checkbox, Field, Input, PasswordInput } from '@/components/ui/Form';
import { Skeleton } from '@/components/ui/Spinner';
import { useAffiliateAuth } from '@/context/AffiliateAuthContext';
import { useToast } from '@/context/ToastContext';
import { StoreNotFound } from '@/features/affiliate-portal/StoreStatusScreen';
import { useStoreBySlug } from '@/features/affiliate-portal/useStoreBySlug';
import { useForm } from '@/hooks/useForm';
import { isEmail, isPhone, rules } from '@/lib/validators';

const schema = {
    identifier: [
        rules.required('أدخل رقم الهاتف أو البريد الإلكتروني'),
        (value) => (value && !isEmail(value) && !isPhone(value) ? 'أدخل رقم هاتف أو بريداً إلكترونياً صحيحاً' : null),
    ],
    password: [rules.required('أدخل كلمة المرور')],
};

/**
 * Store-scoped affiliate sign-in at /{store-slug}/affiliates/login. Affiliates belong to
 * one store, so the slug in the URL tells the API which store's accounts to check.
 */
export function AffiliateLoginPage() {
    const { storeSlug } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const { login, isAuthenticated, isImpersonating } = useAffiliateAuth();
    const location = useLocation();
    const { store, missing } = useStoreBySlug(storeSlug, 'دخول المسوقين');
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState(null);
    const { values, errors, bind, setField, validateFields } = useForm({ identifier: location.state?.identifier ?? '', password: '', remember: false }, schema);

    if (isAuthenticated && !isImpersonating) {
        return <Navigate to="/affiliate" replace />;
    }

    if (missing) {
        return <StoreNotFound />;
    }

    const onSubmit = async (event) => {
        event.preventDefault();
        setFormError(null);

        if (!validateFields()) {
            return;
        }

        setSubmitting(true);

        try {
            const affiliate = await login({ storeSlug, ...values });

            toast.success(`أهلاً بك يا ${affiliate.full_name.split(' ')[0]} 👋`);
            navigate('/affiliate', { replace: true });
        } catch (error) {
            setFormError(error.errors?.identifier ?? error.errors?.store_slug ?? error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <StorePublicLayout store={store} narrow>
            <div className="mb-8 text-center">
                {store ? <Avatar name={store.name} src={store.logo_url} size="lg" className="mx-auto" /> : <Skeleton className="mx-auto size-14 rounded-xl" />}
                <h1 className="mt-5 text-2xl font-bold text-ink">دخول المسوقين</h1>
                <p className="mt-2 text-sm text-muted">{store ? `تابع أرباحك وروابط الإحالة الخاصة بك في ${store.name}` : ' '}</p>
            </div>

            <form onSubmit={onSubmit} noValidate className="mk-card flex flex-col gap-5 p-6">
                {formError && <Alert tone="danger">{formError}</Alert>}

                <Field label="رقم الهاتف أو البريد الإلكتروني" error={errors.identifier} required>
                    {(props) => <Input {...props} {...bind('identifier')} icon="phone" dir="ltr" className="text-start" autoComplete="username" placeholder="01012345678" autoFocus />}
                </Field>
                <Field
                    label="كلمة المرور"
                    error={errors.password}
                    required
                    action={
                        <Link to={`/${storeSlug}/affiliates/forgot-password`} state={{ identifier: values.identifier }} className="text-xs font-medium text-primary hover:underline">
                            نسيت كلمة المرور؟
                        </Link>
                    }
                >
                    {(props) => <PasswordInput {...props} {...bind('password')} autoComplete="current-password" placeholder="••••••••" />}
                </Field>
                <Checkbox label="تذكرني على هذا الجهاز" checked={values.remember} onChange={(event) => setField('remember', event.target.checked)} />

                <Button type="submit" size="lg" loading={submitting} disabled={!store} className="w-full">
                    {submitting ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}
                </Button>
            </form>

            <div className="mt-6 flex flex-col gap-2 text-center text-xs leading-relaxed text-muted">
                <p>سجّلت برقم هاتف فقط ونسيت كلمة المرور؟ تواصل مع المتجر لإعادة تعيينها.</p>
                <p>لست مسوقاً بعد؟ اطلب رابط التسجيل من المتجر للانضمام.</p>
            </div>
        </StorePublicLayout>
    );
}
