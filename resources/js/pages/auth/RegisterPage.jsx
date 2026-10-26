import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthHeading, AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Display';
import { Checkbox, Field, Input, PasswordInput, Select } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { Stepper } from '@/components/ui/Navigation';
import { ImageUpload } from '@/components/ui/Upload';
import { useAuth } from '@/context/AuthContext';
import { useSlugAvailability } from '@/features/auth/useSlugAvailability';
import { useForm } from '@/hooks/useForm';
import { t } from '@/i18n';
import { APP_DOMAIN, MAX_LOGO_SIZE_MB } from '@/lib/constants';
import { cn } from '@/lib/format';
import { GOVERNORATES, findGovernorate } from '@/lib/locations';
import { slugify } from '@/lib/slug';
import { normalizePhone, rules } from '@/lib/validators';

const STEPS = [
    { title: t('البيانات الأساسية'), description: t('بياناتك الشخصية وكلمة المرور'), icon: 'user' },
    { title: t('بيانات المتجر'), description: t('هوية متجرك وعنوانه'), icon: 'store' },
];

const STEP_FIELDS = [
    ['full_name', 'phone', 'email', 'password', 'password_confirmation'],
    ['store_name', 'governorate_id', 'city_id', 'slug', 'accept_terms'],
];

const INITIAL_VALUES = {
    full_name: '',
    phone: '',
    email: '',
    password: '',
    password_confirmation: '',
    store_name: '',
    store_logo: null,
    governorate_id: '',
    city_id: '',
    slug: '',
    accept_terms: false,
};

const schema = {
    full_name: [rules.required(t('أدخل اسمك بالكامل')), rules.minLength(5, t('اكتب الاسم الثنائي على الأقل'))],
    phone: [rules.required(t('أدخل رقم الهاتف / الواتساب')), rules.phone()],
    email: [rules.required(t('أدخل البريد الإلكتروني')), rules.email()],
    password: [rules.required(t('أدخل كلمة المرور')), rules.password()],
    password_confirmation: [rules.required(t('أعد كتابة كلمة المرور')), rules.matches('password')],
    store_name: [rules.required(t('أدخل اسم المتجر')), rules.minLength(2, t('اسم المتجر قصير جداً'))],
    governorate_id: [rules.required(t('اختر المحافظة'))],
    city_id: [rules.required(t('اختر المدينة'))],
    slug: [rules.required(t('اختر رابطاً لمتجرك')), rules.slug()],
    accept_terms: [(value) => (value ? null : t('يجب الموافقة على الشروط والأحكام للمتابعة'))],
};

/** Maps API validation keys ("vendor.email") back to wizard field names. */
const SERVER_FIELD_MAP = {
    'vendor.full_name': 'full_name',
    'vendor.phone': 'phone',
    'vendor.email': 'email',
    'vendor.password': 'password',
    'store.name': 'store_name',
    'store.slug': 'slug',
    'store.logo': 'store_logo',
    'store.governorate_id': 'governorate_id',
    'store.city_id': 'city_id',
};

const SLUG_STATUS = {
    checking: { icon: null, text: t('جارٍ التحقق من توفر الرابط...'), className: 'text-muted' },
    available: { icon: 'check-circle', text: t('رائع! هذا الرابط متاح لمتجرك'), className: 'text-success' },
    taken: { icon: 'alert-circle', text: t('هذا الرابط محجوز، جرّب اسماً آخر'), className: 'text-danger' },
};

export function RegisterPage() {
    const [step, setStep] = useState(0);
    const [slugEdited, setSlugEdited] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState(null);
    const { register } = useAuth();
    const navigate = useNavigate();
    const { values, errors, setErrors, setField, setValues, bind, validateFields } = useForm(INITIAL_VALUES, schema);
    const slugStatus = useSlugAvailability(values.slug);

    const cities = useMemo(() => findGovernorate(values.governorate_id)?.cities ?? [], [values.governorate_id]);

    const goNext = () => {
        if (validateFields(STEP_FIELDS[0])) {
            setStep(1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const onStoreNameChange = (event) => {
        const storeName = event.target.value;

        // Keep suggesting a slug from the store name until the vendor edits it by hand.
        setValues({ ...values, store_name: storeName, slug: slugEdited ? values.slug : slugify(storeName) });
    };

    const onSubmit = async (event) => {
        event.preventDefault();
        setFormError(null);

        if (step === 0) {
            goNext();

            return;
        }

        if (!validateFields(STEP_FIELDS[1])) {
            return;
        }

        if (slugStatus === 'taken') {
            setErrors((previous) => ({ ...previous, slug: SLUG_STATUS.taken.text }));

            return;
        }

        setSubmitting(true);

        try {
            const verification = await register({
                vendor: {
                    full_name: values.full_name.trim(),
                    phone: normalizePhone(values.phone),
                    email: values.email.trim().toLowerCase(),
                    password: values.password,
                    password_confirmation: values.password_confirmation,
                },
                store: {
                    name: values.store_name.trim(),
                    slug: values.slug,
                    logo: values.store_logo,
                    governorate_id: values.governorate_id,
                    city_id: values.city_id,
                },
            });

            navigate('/verify-email', { replace: true, state: { verification, isNewStore: true } });
        } catch (error) {
            const fieldErrors = Object.fromEntries(Object.entries(error.errors ?? {}).map(([key, message]) => [SERVER_FIELD_MAP[key] ?? key, message]));

            setErrors(fieldErrors);
            setFormError(error.message);

            if (STEP_FIELDS[0].some((field) => fieldErrors[field])) {
                setStep(0);
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AuthLayout wide>
            <AuthHeading title={t('أنشئ متجرك على Sellygrow')} subtitle={t('خطوتان فقط وتبدأ في إدارة مخزونك ومسوقيك من مكان واحد.')} />

            <div>
                <div className="rounded-xl border border-line bg-surface-2 px-5 py-4">
                    <Stepper steps={STEPS} current={step} />
                </div>

                <form onSubmit={onSubmit} noValidate className="pt-7">
                    {formError && <Alert tone="danger" className="mb-6">{formError}</Alert>}

                    {step === 0 ? (
                        <div key="step-1" className="animate-step-in grid gap-5 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <p className="text-xs font-semibold text-primary">{t('الخطوة 1 من 2')}</p>
                                <h2 className="mt-1 text-lg font-semibold text-ink">{t('البيانات الأساسية')}</h2>
                            </div>
                            <Field label={t('الاسم بالكامل')} error={errors.full_name} required className="sm:col-span-2">
                                {(props) => <Input {...props} {...bind('full_name')} icon="user" autoComplete="name" placeholder={t('مثال: محمد أحمد علي')} autoFocus />}
                            </Field>
                            <Field label={t('رقم الهاتف / الواتساب')} error={errors.phone} required>
                                {(props) => <Input {...props} {...bind('phone')} icon="phone" type="tel" dir="ltr" inputMode="tel" className="text-start" autoComplete="tel" placeholder="01012345678" />}
                            </Field>
                            <Field label={t('البريد الإلكتروني')} error={errors.email} required>
                                {(props) => <Input {...props} {...bind('email')} icon="mail" type="email" dir="ltr" className="text-start" autoComplete="email" placeholder="name@example.com" />}
                            </Field>
                            <Field label={t('كلمة المرور')} error={errors.password} required>
                                {(props) => <PasswordInput {...props} {...bind('password')} showStrength placeholder={t('8 أحرف على الأقل')} />}
                            </Field>
                            <Field label={t('تأكيد كلمة المرور')} error={errors.password_confirmation} required>
                                {(props) => <PasswordInput {...props} {...bind('password_confirmation')} placeholder={t('أعد كتابة كلمة المرور')} />}
                            </Field>
                        </div>
                    ) : (
                        <div key="step-2" className="animate-step-in grid gap-5 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <p className="text-xs font-semibold text-primary">{t('الخطوة 2 من 2')}</p>
                                <h2 className="mt-1 text-lg font-semibold text-ink">{t('بيانات المتجر')}</h2>
                            </div>
                            <Field label={t('لوجو المتجر')} optional error={errors.store_logo} className="sm:col-span-2">
                                {() => (
                                    <ImageUpload
                                        value={values.store_logo}
                                        onChange={(file) => setField('store_logo', file)}
                                        onError={(message) => setErrors((previous) => ({ ...previous, store_logo: message ?? undefined }))}
                                        label={t('رفع لوجو المتجر')}
                                        maxSizeMb={MAX_LOGO_SIZE_MB}
                                        hint={t('يفضّل صورة مربعة 512×512 بكسل — PNG أو JPG، بحد أقصى {MAX_LOGO_SIZE_MB} ميجابايت', { MAX_LOGO_SIZE_MB })}
                                    />
                                )}
                            </Field>
                            <Field label={t('اسم المتجر')} error={errors.store_name} required className="sm:col-span-2">
                                {(props) => <Input {...props} {...bind('store_name')} onChange={onStoreNameChange} icon="store" placeholder={t('مثال: نور للأزياء')} autoFocus />}
                            </Field>
                            <Field label={t('المحافظة')} error={errors.governorate_id} required>
                                {(props) => (
                                    <Select
                                        {...props}
                                        {...bind('governorate_id')}
                                        onChange={(event) => setValues({ ...values, governorate_id: event.target.value, city_id: '' })}
                                        icon="map-pin"
                                        placeholder={t('اختر المحافظة')}
                                        options={GOVERNORATES.map((governorate) => ({ value: governorate.id, label: governorate.name }))}
                                    />
                                )}
                            </Field>
                            <Field label={t('المدينة')} error={errors.city_id} required>
                                {(props) => (
                                    <Select
                                        {...props}
                                        {...bind('city_id')}
                                        disabled={!values.governorate_id}
                                        icon="building"
                                        placeholder={values.governorate_id ? t('اختر المدينة') : t('اختر المحافظة أولاً')}
                                        options={cities.map((city) => ({ value: city.id, label: city.name }))}
                                    />
                                )}
                            </Field>
                            <Field label={t('رابط المتجر')} error={errors.slug} hint={!errors.slug && !SLUG_STATUS[slugStatus] ? t('حروف إنجليزية صغيرة وأرقام وشرطة (-) فقط') : undefined} required className="sm:col-span-2">
                                {(props) => (
                                    <div className="flex flex-col gap-2">
                                        <div
                                            dir="ltr"
                                            className={cn(
                                                'flex h-11 items-center overflow-hidden rounded-lg border bg-surface transition',
                                                errors.slug || slugStatus === 'taken' ? 'border-danger' : 'border-line focus-within:border-primary',
                                            )}
                                        >
                                            <span className="flex h-full items-center border-e border-line bg-surface-2 px-3 text-sm text-muted select-none">{APP_DOMAIN}/</span>
                                            <input
                                                {...props}
                                                {...bind('slug')}
                                                onChange={(event) => {
                                                    setSlugEdited(true);
                                                    setField('slug', event.target.value.toLowerCase().replace(/\s+/g, '-'));
                                                }}
                                                className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm text-ink outline-none placeholder:text-muted"
                                                placeholder="my-store"
                                                autoComplete="off"
                                                spellCheck="false"
                                            />
                                            {slugStatus === 'available' && <Icon name="check-circle" className="me-3 size-5 text-success" />}
                                        </div>
                                        {!errors.slug && SLUG_STATUS[slugStatus] && (
                                            <p className={cn('flex items-center gap-1.5 text-xs', SLUG_STATUS[slugStatus].className)} aria-live="polite">
                                                {SLUG_STATUS[slugStatus].icon && <Icon name={SLUG_STATUS[slugStatus].icon} className="size-3.5" />}
                                                {SLUG_STATUS[slugStatus].text}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </Field>
                            <div className="sm:col-span-2">
                                <Checkbox
                                    checked={values.accept_terms}
                                    onChange={(event) => setField('accept_terms', event.target.checked)}
                                    label={
                                        <>
                                            {t('أوافق على ')}
                                            <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                                                {t('الشروط والأحكام')}
                                            </a>{' '}
                                            {t('و ')}
                                            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                                                {t('سياسة الخصوصية')}
                                            </a>{' '}
                                            {t('الخاصة بمنصة Sellygrow')}
                                        </>
                                    }
                                />
                                {errors.accept_terms && <p className="mt-1.5 text-xs text-danger">{errors.accept_terms}</p>}
                            </div>
                        </div>
                    )}

                    <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-6">
                        {step === 1 ? (
                            <Button variant="secondary" icon="arrow-right" onClick={() => setStep(0)} disabled={submitting}>
                                {t('السابق')}
                            </Button>
                        ) : (
                            <span />
                        )}
                        <Button type="submit" size="lg" loading={submitting} iconEnd={step === 0 ? 'arrow-left' : 'check'}>
                            {step === 0 ? t('التالي: بيانات المتجر') : submitting ? t('جارٍ إنشاء المتجر...') : t('إنشاء المتجر')}
                        </Button>
                    </div>
                </form>
            </div>

            <p className="mt-8 text-center text-sm text-muted">
                {t('لديك حساب بالفعل؟ ')}
                <Link to="/login" className="font-semibold text-primary hover:underline">
                    {t('سجّل الدخول')}
                </Link>
            </p>
        </AuthLayout>
    );
}
