import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { StorePublicLayout } from '@/components/layout/StorePublicLayout';
import { Button } from '@/components/ui/Button';
import { Alert, Badge } from '@/components/ui/Display';
import { Checkbox, Field, Input, PasswordInput } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Spinner';
import { PAYOUT_INITIAL_VALUES, PayoutMethodFields, buildPayoutPayload, mapServerErrors, payoutSchema } from '@/features/affiliates/payoutFields';
import { useCopy } from '@/hooks/common';
import { useForm } from '@/hooks/useForm';
import { t } from '@/i18n';
import { AFFILIATE_TIERS } from '@/lib/constants';
import { normalizePhone, rules } from '@/lib/validators';
import { affiliateRegistrationApi } from '@/services/affiliateRegistrationApi';

const INITIAL_VALUES = {
    full_name: '',
    phone: '',
    email: '',
    password: '',
    password_confirmation: '',
    accept_terms: false,
    ...PAYOUT_INITIAL_VALUES,
};

const schema = (values) => ({
    full_name: [rules.required(t('أدخل اسمك بالكامل')), rules.minLength(5, t('اكتب الاسم الثنائي على الأقل'))],
    phone: [rules.required(t('أدخل رقم هاتفك')), rules.phone()],
    email: [rules.required(t('أدخل البريد الإلكتروني')), rules.email()],
    password: [rules.required(t('أدخل كلمة المرور')), rules.password()],
    password_confirmation: [rules.required(t('أعد كتابة كلمة المرور')), rules.matches('password')],
    accept_terms: [(value) => (value ? null : t('يجب الموافقة على شروط برنامج المسوقين للمتابعة'))],
    ...payoutSchema(values),
});

const STEPS = [
    { icon: 'user-plus', title: t('سجّل بياناتك'), text: t('دقيقتان فقط ولا تحتاج أي رسوم.') },
    { icon: 'link', title: t('شارك رابطك'), text: t('انشر رابط الإحالة الخاص بك على صفحاتك وجروباتك.') },
    { icon: 'wallet', title: t('اربح عمولتك'), text: t('عمولة على كل طلب يتم توصيله، تُحوَّل لمحفظتك.') },
];

function InvalidLink() {
    return (
        <StorePublicLayout>
            <div className="animate-pop mx-auto max-w-md text-center">
                <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-danger-soft text-danger">
                    <Icon name="link" className="size-8" />
                </span>
                <h1 className="mt-6 mk-page-title">{t('رابط التسجيل غير متاح')}</h1>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                    {t('قد يكون الرابط منتهياً، أو أوقفه صاحب المتجر مؤقتاً، أو تم نسخه بشكل ناقص. تواصل مع المتجر للحصول على رابط تسجيل جديد.')}
                </p>
            </div>
        </StorePublicLayout>
    );
}

function SuccessScreen({ store, result }) {
    const { copy, copiedValue } = useCopy();

    if (result.requires_approval) {
        return (
            <StorePublicLayout store={store}>
                <div className="animate-pop mx-auto max-w-md text-center">
                    <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-warning-soft text-warning">
                        <Icon name="check-circle" className="size-8" />
                    </span>
                    <h1 className="mt-6 mk-page-title">{t('تم استلام طلبك يا {value}', { value: result.full_name.split(' ')[0] })}</h1>
                    <p className="mt-3 text-sm leading-relaxed text-muted">{result.message}</p>
                    <div className="mk-card mt-8 p-5 text-start">
                        <p className="text-sm font-semibold text-ink">{t('ماذا بعد؟')}</p>
                        <ul className="mt-3 flex flex-col gap-2 text-sm text-ink-2">
                            <li className="flex gap-2">
                                <Icon name="shield-check" className="mt-0.5 size-4 shrink-0 text-primary" />
                                {t('يراجع فريق {name} طلبك عادةً خلال ٤٨ ساعة.', { name: store.name })}
                            </li>
                            <li className="flex gap-2">
                                <Icon name="link" className="mt-0.5 size-4 shrink-0 text-primary" />
                                {t('بعد الموافقة يتم إنشاء رابط الإحالة الخاص بك تلقائياً.')}
                            </li>
                            <li className="flex gap-2">
                                <Icon name="log-in" className="mt-0.5 size-4 shrink-0 text-primary" />
                                {t('ادخل بعدها إلى لوحتك برقم هاتفك وكلمة المرور التي اخترتها.')}
                            </li>
                        </ul>
                    </div>
                    <Button to={`/${store.slug}/affiliates/login`} variant="secondary" size="lg" icon="log-in" className="mt-4 w-full">
                        {t('صفحة دخول المسوقين')}
                    </Button>
                </div>
            </StorePublicLayout>
        );
    }

    const shareText = encodeURIComponent(t('تسوّق من {name} عبر رابطي 🛍️\n{referral_url}', { name: store.name, referral_url: result.referral_url }));

    return (
        <StorePublicLayout store={store}>
            <div className="animate-pop mx-auto max-w-lg text-center">
                <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-success-soft text-success">
                    <Icon name="sparkles" className="size-8" />
                </span>
                <h1 className="mt-6 mk-page-title">{t('أهلاً بك في فريق {name}!', { name: store.name })}</h1>
                <p className="mt-3 text-sm leading-relaxed text-muted">{result.message}</p>

                <div className="mk-card mt-8 p-5 text-start">
                    <p className="text-xs text-muted">{t('كود الإحالة الخاص بك')}</p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="ltr rounded-lg bg-primary-soft px-3 py-1.5 font-mono text-lg font-bold text-primary">{result.referral_code}</span>
                        <Button size="sm" variant={copiedValue === result.referral_code ? 'success' : 'secondary'} icon={copiedValue === result.referral_code ? 'check' : 'copy'} onClick={() => copy(result.referral_code)}>
                            {copiedValue === result.referral_code ? t('تم النسخ') : t('نسخ الكود')}
                        </Button>
                    </div>
                    <p className="mt-5 text-xs text-muted">{t('رابط الإحالة')}</p>
                    <div className="mt-2 flex items-center gap-2" dir="ltr">
                        <code className="min-w-0 flex-1 truncate rounded-lg border border-line bg-surface-2 px-3 py-2.5 font-mono text-xs text-ink-2">{result.referral_url}</code>
                        <Button icon={copiedValue === result.referral_url ? 'check' : 'copy'} variant={copiedValue === result.referral_url ? 'success' : 'primary'} onClick={() => copy(result.referral_url)}>
                            {copiedValue === result.referral_url ? t('تم') : t('نسخ')}
                        </Button>
                    </div>
                    <a
                        href={`https://wa.me/?text=${shareText}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 flex h-11 items-center justify-center gap-2 rounded-xl bg-[#25D366] text-sm font-semibold text-white hover:opacity-90"
                    >
                        <Icon name="phone" className="size-4" />
                        {t('شارك الرابط عبر واتساب')}
                    </a>
                </div>
                <Button to={`/${store.slug}/affiliates/login`} variant="secondary" size="lg" icon="log-in" className="mt-4 w-full">
                    {t('الدخول إلى لوحة المسوق')}
                </Button>
            </div>
        </StorePublicLayout>
    );
}

/**
 * Public "join our affiliates" page behind the link vendors share:
 * /{store-slug}/affiliates/join?t={token}. The token alone identifies the store.
 */
export function AffiliateJoinPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('t') ?? '';
    const [link, setLink] = useState(null);
    const [loadState, setLoadState] = useState(token ? 'loading' : 'invalid');
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState(null);
    const [result, setResult] = useState(null);
    const { values, errors, setErrors, setField, setValues, bind, validateFields } = useForm(INITIAL_VALUES, schema);

    useEffect(() => {
        if (!token) {
            return undefined;
        }

        let cancelled = false;

        affiliateRegistrationApi
            .show(token)
            .then((data) => {
                if (!cancelled) {
                    setLink(data);
                    setLoadState('ready');
                    document.title = t('انضم لفريق مسوقي {name} | Sellygrow', { name: data.store.name });
                }
            })
            .catch(() => !cancelled && setLoadState('invalid'));

        return () => {
            cancelled = true;
        };
    }, [token]);

    if (loadState === 'invalid') {
        return <InvalidLink />;
    }

    if (result) {
        return <SuccessScreen store={link.store} result={result} />;
    }

    const onSubmit = async (event) => {
        event.preventDefault();
        setFormError(null);

        if (!validateFields()) {
            return;
        }

        setSubmitting(true);

        try {
            setResult(
                await affiliateRegistrationApi.register(token, {
                    full_name: values.full_name.trim(),
                    phone: normalizePhone(values.phone),
                    email: values.email.trim().toLowerCase(),
                    password: values.password,
                    password_confirmation: values.password_confirmation,
                    payout_method: buildPayoutPayload(values),
                }),
            );
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
            if (error.status === 404) {
                // The vendor disabled or regenerated the link while the form was open.
                setLoadState('invalid');

                return;
            }

            setErrors(mapServerErrors(error.errors));
            setFormError(error.status === 429 ? t('محاولات كثيرة من هذا الجهاز. انتظر قليلاً ثم حاول مرة أخرى.') : error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const store = link?.store;
    const tier = link && AFFILIATE_TIERS[link.tier];

    return (
        <StorePublicLayout store={store}>
            <div className="grid gap-8 lg:grid-cols-[1fr_1.35fr] lg:items-start">
                <aside className="flex flex-col gap-6 lg:sticky lg:top-8">
                    <div>
                        {store ? (
                            <>
                                <Badge tone="primary" icon="megaphone">
                                    {t('برنامج المسوقين')}
                                </Badge>
                                <h1 className="mt-4 text-[30px] leading-tight font-bold text-ink">{t('انضم لفريق مسوقي {name}', { name: store.name })}</h1>
                                <p className="mt-3 text-sm leading-relaxed text-muted">{t('سوّق منتجات {name} لمتابعيك واربح عمولة على كل طلب يتم توصيله عبر رابطك.', { name: store.name })}</p>
                            </>
                        ) : (
                            <div className="flex flex-col gap-3">
                                <Skeleton className="h-6 w-28" />
                                <Skeleton className="h-9 w-4/5" />
                                <Skeleton className="h-4 w-full" />
                            </div>
                        )}
                    </div>

                    <div className="relative overflow-hidden rounded-2xl bg-panel p-6 text-white shadow-raise">
                        <div className="mk-grid-texture absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent)]" aria-hidden="true" />
                        <p className="relative text-sm text-panel-text">{t('عمولتك على كل طلب')}</p>
                        <p className="mk-num relative mt-1 text-[40px] leading-[48px] font-semibold text-sprout">{link ? `${link.commission_percentage}%` : '—'}</p>
                        <p className="relative mt-2 text-xs text-panel-text/80">{tier ? t('تبدأ كـ «{label}» ويمكن ترقيتك حسب أدائك', { label: tier.label }) : ' '}</p>
                    </div>

                    <ol className="flex flex-col gap-4">
                        {STEPS.map((step, index) => (
                            <li key={step.title} className="flex items-start gap-3">
                                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary ring-1 ring-primary/10 ring-inset">
                                    <Icon name={step.icon} className="size-5" />
                                </span>
                                <span>
                                    <span className="block text-sm font-semibold text-ink">
                                        {index + 1}. {step.title}
                                    </span>
                                    <span className="mt-0.5 block text-xs leading-relaxed text-muted">{step.text}</span>
                                </span>
                            </li>
                        ))}
                    </ol>
                </aside>

                <form onSubmit={onSubmit} noValidate className="mk-card overflow-hidden">
                    <div className="border-b border-line bg-surface-2 px-6 py-5">
                        <h2 className="text-lg font-semibold text-ink">{t('بيانات التسجيل')}</h2>
                        <p className="mt-1 text-xs text-muted">
                            {link?.requires_approval ? t('سيراجع صاحب المتجر طلبك قبل تفعيل حسابك.') : t('سيتم تفعيل حسابك فوراً بعد التسجيل.')}
                        </p>
                    </div>

                    <fieldset disabled={loadState !== 'ready' || submitting} className="grid gap-5 p-6 sm:grid-cols-2">
                        {formError && <Alert tone="danger" className="sm:col-span-2">{formError}</Alert>}

                        <Field label={t('الاسم بالكامل')} error={errors.full_name} required className="sm:col-span-2">
                            {(props) => <Input {...props} {...bind('full_name')} icon="user" autoComplete="name" placeholder={t('مثال: سارة محمود إبراهيم')} />}
                        </Field>
                        <Field label={t('رقم الهاتف / الواتساب')} error={errors.phone} required>
                            {(props) => <Input {...props} {...bind('phone')} icon="phone" type="tel" dir="ltr" inputMode="tel" className="text-start" autoComplete="tel" placeholder="01012345678" />}
                        </Field>
                        <Field label={t('البريد الإلكتروني')} hint={t('ستستخدمه لتسجيل الدخول')} required error={errors.email}>
                            {(props) => <Input {...props} {...bind('email')} icon="mail" type="email" dir="ltr" className="text-start" autoComplete="email" placeholder="name@example.com" />}
                        </Field>
                        <Field label={t('كلمة المرور')} error={errors.password} required>
                            {(props) => <PasswordInput {...props} {...bind('password')} showStrength placeholder={t('٨ أحرف على الأقل')} />}
                        </Field>
                        <Field label={t('تأكيد كلمة المرور')} error={errors.password_confirmation} required>
                            {(props) => <PasswordInput {...props} {...bind('password_confirmation')} placeholder={t('أعد كتابة كلمة المرور')} />}
                        </Field>

                        <div className="h-px bg-line sm:col-span-2" />
                        <div className="sm:col-span-2">
                            <h3 className="text-sm font-semibold text-ink">{t('أين تريد استلام أرباحك؟')}</h3>
                            <p className="mt-0.5 text-xs text-muted">{t('يمكنك تغييرها لاحقاً بالتواصل مع المتجر.')}</p>
                        </div>
                        <PayoutMethodFields values={values} errors={errors} bind={bind} setValues={setValues} />

                        <div className="sm:col-span-2">
                            <Checkbox
                                checked={values.accept_terms}
                                onChange={(event) => setField('accept_terms', event.target.checked)}
                                label={t('أوافق على شروط برنامج المسوقين الخاص بـ {value} وسياسة الخصوصية', { value: store?.name ?? 'المتجر' })}
                            />
                            {errors.accept_terms && <p className="mt-1.5 text-xs text-danger">{errors.accept_terms}</p>}
                        </div>

                        <Button type="submit" size="lg" loading={submitting} icon="user-plus" className="w-full sm:col-span-2">
                            {submitting ? t('جارٍ إرسال الطلب...') : link?.requires_approval ? t('إرسال طلب الانضمام') : t('إنشاء حسابي')}
                        </Button>

                        {store && (
                            <p className="text-center text-sm text-muted sm:col-span-2">
                                {t('لديك حساب بالفعل؟ ')}
                                <Link to={`/${store.slug}/affiliates/login`} className="font-semibold text-primary hover:underline">
                                    {t('سجّل دخولك')}
                                </Link>
                            </p>
                        )}
                    </fieldset>
                </form>
            </div>
        </StorePublicLayout>
    );
}
