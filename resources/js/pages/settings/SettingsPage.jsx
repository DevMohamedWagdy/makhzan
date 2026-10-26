import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Alert, Avatar, EmptyState } from '@/components/ui/Display';
import { Field, Input, PasswordInput, Select, Switch, Textarea } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { Tabs } from '@/components/ui/Navigation';
import { Skeleton } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { PaymentSettingsTab } from '@/features/payments/PaymentSettingsTab';
import { DomainTab } from '@/features/settings/DomainTab';
import { TrackingTab } from '@/features/settings/TrackingTab';
import { useCopy } from '@/hooks/common';
import { t } from '@/i18n';
import { CURRENCY } from '@/lib/constants';
import { GOVERNORATES, findGovernorate } from '@/lib/locations';
import { authApi } from '@/services/authApi';
import { storeSettingsApi } from '@/services/storeSettingsApi';

/** Staff see only the tabs their permissions cover; everyone has "my account". */
const TABS = [
    { value: 'store', label: t('بيانات المتجر'), icon: 'store', permission: 'settings' },
    { value: 'contact', label: t('التواصل'), icon: 'phone', permission: 'settings' },
    { value: 'orders', label: t('الطلبات'), icon: 'shopping-bag', permission: 'settings' },
    { value: 'payments', label: t('الدفع'), icon: 'credit-card', permission: 'payments' },
    { value: 'policies', label: t('السياسات'), icon: 'shield-check', permission: 'settings' },
    { value: 'domain', label: t('الدومين'), icon: 'link', permission: 'settings' },
    { value: 'tracking', label: t('التتبع والإعلانات'), icon: 'bar-chart', permission: 'settings' },
    { value: 'account', label: t('حسابي'), icon: 'user' },
];

const POLICIES = [
    { key: 'return_policy', label: t('سياسة الاسترجاع والاستبدال'), placeholder: t('مثال: يمكن استرجاع المنتج خلال 14 يوماً من الاستلام بحالته الأصلية...') },
    { key: 'shipping_policy', label: t('سياسة الشحن والتوصيل'), placeholder: t('مثال: التوصيل خلال 2-5 أيام عمل حسب المحافظة...') },
    { key: 'privacy_policy', label: t('سياسة الخصوصية'), placeholder: t('مثال: نستخدم بياناتك لتوصيل طلبك فقط ولا نشاركها مع أي طرف آخر...') },
    { key: 'terms', label: t('الشروط والأحكام'), placeholder: t('مثال: الأسعار شاملة الضريبة، والدفع عند الاستلام...') },
];

/** Local copy of some settings fields, saved together by `save()`. Empty strings are sent as null. */
function useSection(settings, keys, onSaved) {
    const toast = useToast();
    const initial = useMemo(() => Object.fromEntries(keys.map((key) => [key, settings[key] ?? ''])), [settings, keys]);
    const [values, setValues] = useState(initial);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => setValues(initial), [initial]);

    const bind = (key) => ({
        value: values[key] ?? '',
        onChange: (event) => {
            setValues((current) => ({ ...current, [key]: event.target.value }));
            setErrors((current) => ({ ...current, [key]: undefined }));
        },
        'aria-invalid': errors[key] ? 'true' : undefined,
    });

    const save = async (event, transform = (payload) => payload) => {
        event?.preventDefault();
        setSaving(true);

        try {
            const payload = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, typeof value === 'string' ? value.trim() || null : value]));
            const updated = await storeSettingsApi.update(transform(payload));

            toast.success(t('تم حفظ الإعدادات'));
            onSaved(updated);
        } catch (error) {
            setErrors(error.errors ?? {});
            toast.error(t('تعذر حفظ الإعدادات'), error.message);
        } finally {
            setSaving(false);
        }
    };

    return { values, setValues, errors, bind, save, saving, dirty: JSON.stringify(values) !== JSON.stringify(initial) };
}

function SaveBar({ saving, dirty }) {
    return (
        <div className="flex justify-end border-t border-line pt-4">
            <Button type="submit" loading={saving} disabled={!dirty} icon="check">
                {t('حفظ التغييرات')}
            </Button>
        </div>
    );
}

const STORE_KEYS = ['name', 'description', 'governorate_id', 'city_id'];

function StoreTab({ settings, onSaved }) {
    const toast = useToast();
    const { copy, copiedValue } = useCopy();
    const { values, setValues, errors, bind, save, saving, dirty } = useSection(settings, STORE_KEYS, onSaved);
    const [logoBusy, setLogoBusy] = useState(false);
    const fileRef = useRef(null);
    const cities = findGovernorate(values.governorate_id)?.cities ?? [];

    const changeLogo = async (file) => {
        if (!file) {
            return;
        }

        setLogoBusy(true);

        try {
            onSaved(file === 'remove' ? await storeSettingsApi.removeLogo() : await storeSettingsApi.uploadLogo(file));
            toast.success(file === 'remove' ? t('تم حذف اللوجو') : t('تم تحديث اللوجو'));
        } catch (error) {
            toast.error(t('تعذر تحديث اللوجو'), error.errors?.logo ?? error.message);
        } finally {
            setLogoBusy(false);

            if (fileRef.current) {
                fileRef.current.value = '';
            }
        }
    };

    return (
        <form onSubmit={save} noValidate className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-4">
                <Avatar name={settings.name} src={settings.logo_url} size="xl" />
                <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium text-ink">{t('لوجو المتجر')}</p>
                    <p className="text-xs text-muted">{t('PNG أو JPG أو WEBP، بحد أقصى 2 ميجا. يظهر في أعلى متجرك.')}</p>
                    <div className="flex gap-2">
                        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => changeLogo(event.target.files?.[0])} />
                        <Button size="sm" variant="secondary" icon="upload" loading={logoBusy} onClick={() => fileRef.current?.click()}>
                            {settings.logo_url ? t('تغيير اللوجو') : t('رفع لوجو')}
                        </Button>
                        {settings.logo_url && (
                            <Button size="sm" variant="ghost" icon="trash" disabled={logoBusy} onClick={() => changeLogo('remove')}>
                                {t('حذف')}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t('اسم المتجر')} required error={errors.name} className="sm:col-span-2">
                    {(props) => <Input {...props} {...bind('name')} maxLength={100} />}
                </Field>
                <Field label={t('وصف المتجر')} optional error={errors.description} hint={t('جملة أو جملتين تظهر في فوتر متجرك.')} className="sm:col-span-2">
                    {(props) => <Textarea {...props} {...bind('description')} maxLength={500} placeholder={t('مثال: أزياء نسائية عصرية بأسعار مناسبة، شحن لكل المحافظات.')} />}
                </Field>
                <Field label={t('المحافظة')} required error={errors.governorate_id}>
                    {(props) => (
                        <Select
                            {...props}
                            value={values.governorate_id}
                            onChange={(event) => setValues({ ...values, governorate_id: event.target.value, city_id: '' })}
                            icon="map-pin"
                            options={GOVERNORATES.map((governorate) => ({ value: governorate.id, label: governorate.name }))}
                        />
                    )}
                </Field>
                <Field label={t('المدينة')} required error={errors.city_id}>
                    {(props) => <Select {...props} {...bind('city_id')} icon="building" placeholder={t('اختر المدينة')} options={cities.map((city) => ({ value: city.id, label: city.name }))} />}
                </Field>
            </div>

            <div className="rounded-xl bg-surface-2 p-4">
                <p className="text-sm font-medium text-ink">{t('رابط المتجر')}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                    <code className="ltr min-w-0 flex-1 truncate rounded-lg border border-line bg-surface px-3 py-2 text-start font-mono text-xs text-ink-2">{settings.url}</code>
                    <Button size="sm" variant={copiedValue === settings.url ? 'success' : 'secondary'} icon={copiedValue === settings.url ? 'check' : 'copy'} onClick={() => copy(settings.url)}>
                        {copiedValue === settings.url ? t('تم النسخ') : t('نسخ')}
                    </Button>
                </div>
                <p className="mt-2 text-xs text-muted">{t('رابط المتجر ثابت ولا يمكن تغييره، حتى لا تتعطل روابط المسوقين والكوبونات التي تمت مشاركتها.')}</p>
            </div>

            <SaveBar saving={saving} dirty={dirty} />
        </form>
    );
}

const CONTACT_KEYS = ['contact_phone', 'whatsapp', 'contact_email', 'address', 'facebook_url', 'instagram_url', 'tiktok_url'];

function ContactTab({ settings, onSaved }) {
    const { errors, bind, save, saving, dirty } = useSection(settings, CONTACT_KEYS, onSaved);
    const ltrInput = (key, props, extra = {}) => <Input {...props} {...bind(key)} dir="ltr" className="text-start" {...extra} />;

    return (
        <form onSubmit={save} noValidate className="flex flex-col gap-6">
            <p className="text-sm text-muted">{t('تظهر هذه البيانات في فوتر متجرك ليتواصل معك العملاء.')}</p>
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t('رقم الهاتف')} optional error={errors.contact_phone}>
                    {(props) => ltrInput('contact_phone', props, { inputMode: 'tel', placeholder: '01xxxxxxxxx' })}
                </Field>
                <Field label={t('رقم الواتساب')} optional error={errors.whatsapp} hint={t('يظهر زر للمحادثة مباشرة.')}>
                    {(props) => ltrInput('whatsapp', props, { inputMode: 'tel', placeholder: '01xxxxxxxxx' })}
                </Field>
                <Field label={t('البريد الإلكتروني')} optional error={errors.contact_email}>
                    {(props) => ltrInput('contact_email', props, { type: 'email' })}
                </Field>
                <Field label={t('العنوان')} optional error={errors.address}>
                    {(props) => <Input {...props} {...bind('address')} maxLength={255} />}
                </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
                <Field label={t('فيسبوك')} optional error={errors.facebook_url}>
                    {(props) => ltrInput('facebook_url', props, { placeholder: 'https://facebook.com/...' })}
                </Field>
                <Field label={t('انستجرام')} optional error={errors.instagram_url}>
                    {(props) => ltrInput('instagram_url', props, { placeholder: 'https://instagram.com/...' })}
                </Field>
                <Field label={t('تيك توك')} optional error={errors.tiktok_url}>
                    {(props) => ltrInput('tiktok_url', props, { placeholder: 'https://tiktok.com/@...' })}
                </Field>
            </div>
            <SaveBar saving={saving} dirty={dirty} />
        </form>
    );
}

const ORDER_KEYS = ['accepting_orders', 'closed_message', 'min_order_total', 'announcement'];

function OrdersTab({ settings, onSaved }) {
    const { values, setValues, errors, bind, save, saving, dirty } = useSection(settings, ORDER_KEYS, onSaved);

    return (
        <form onSubmit={(event) => save(event, (payload) => ({ ...payload, accepting_orders: Boolean(values.accepting_orders), min_order_total: payload.min_order_total === null ? null : Number(payload.min_order_total) }))} noValidate className="flex flex-col gap-6">
            <div className="flex flex-col gap-3 rounded-xl border border-line p-4">
                <Switch checked={Boolean(values.accepting_orders)} onChange={(accepting_orders) => setValues({ ...values, accepting_orders })} label={t('استقبال الطلبات')} description={t('أوقفه مؤقتاً في الإجازات أو عند نفاد البضاعة؛ يبقى المتجر متاحاً للتصفح.')} />
                {!values.accepting_orders && (
                    <Field label={t('رسالة للعملاء')} optional error={errors.closed_message}>
                        {(props) => <Input {...props} {...bind('closed_message')} maxLength={200} placeholder={t('مثال: إجازة العيد، نعود لاستقبال الطلبات يوم الأحد')} />}
                    </Field>
                )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t('أقل قيمة للطلب')} optional error={errors.min_order_total} hint={t('اتركه فارغاً بلا حد أدنى.')}>
                    {(props) => <Input {...props} {...bind('min_order_total')} type="number" inputMode="decimal" min={0} suffix={<span className="px-2 text-sm text-muted">{CURRENCY}</span>} />}
                </Field>
                <Field label={t('شريط الإعلان')} optional error={errors.announcement} hint={t('سطر يظهر أعلى كل صفحات المتجر.')}>
                    {(props) => <Input {...props} {...bind('announcement')} maxLength={200} placeholder={t('مثال: شحن مجاني للطلبات فوق 500 ج.م')} />}
                </Field>
            </div>
            <SaveBar saving={saving} dirty={dirty} />
        </form>
    );
}

const POLICY_KEYS = POLICIES.map((policy) => policy.key);

function PoliciesTab({ settings, onSaved }) {
    const { errors, bind, save, saving, dirty } = useSection(settings, POLICY_KEYS, onSaved);

    return (
        <form onSubmit={save} noValidate className="flex flex-col gap-5">
            <p className="text-sm text-muted">{t('كل سياسة تكتبها تظهر كصفحة في متجرك مع رابط في الفوتر. اترك الخانة فارغة لإخفائها.')}</p>
            {POLICIES.map((policy) => (
                <Field key={policy.key} label={policy.label} optional error={errors[policy.key]}>
                    {(props) => <Textarea {...props} {...bind(policy.key)} rows={5} maxLength={20000} placeholder={policy.placeholder} />}
                </Field>
            ))}
            <SaveBar saving={saving} dirty={dirty} />
        </form>
    );
}

function AccountTab() {
    const toast = useToast();
    const { vendor, updateVendor } = useAuth();
    const [profile, setProfile] = useState({ full_name: vendor?.full_name ?? '', phone: vendor?.phone ?? '', email: vendor?.email ?? '' });
    const [profileErrors, setProfileErrors] = useState({});
    const [savingProfile, setSavingProfile] = useState(false);
    const [passwords, setPasswords] = useState({ current_password: '', password: '', password_confirmation: '' });
    const [passwordErrors, setPasswordErrors] = useState({});
    const [savingPassword, setSavingPassword] = useState(false);

    const saveProfile = async (event) => {
        event.preventDefault();
        setSavingProfile(true);

        try {
            updateVendor(await authApi.updateProfile(profile));
            setProfileErrors({});
            toast.success(t('تم حفظ بياناتك'));
        } catch (error) {
            setProfileErrors(error.errors ?? {});
            toast.error(t('تعذر حفظ بياناتك'), error.message);
        } finally {
            setSavingProfile(false);
        }
    };

    const savePassword = async (event) => {
        event.preventDefault();

        if (passwords.password !== passwords.password_confirmation) {
            setPasswordErrors({ password_confirmation: t('كلمتا المرور غير متطابقتين') });

            return;
        }

        setSavingPassword(true);

        try {
            const { message } = await authApi.updatePassword(passwords);

            toast.success(t('تم تغيير كلمة المرور'), message);
            setPasswords({ current_password: '', password: '', password_confirmation: '' });
            setPasswordErrors({});
        } catch (error) {
            setPasswordErrors(error.errors ?? {});
        } finally {
            setSavingPassword(false);
        }
    };

    const bindProfile = (key) => ({ value: profile[key], onChange: (event) => setProfile({ ...profile, [key]: event.target.value }), 'aria-invalid': profileErrors[key] ? 'true' : undefined });
    const bindPassword = (key) => ({ value: passwords[key], onChange: (event) => setPasswords({ ...passwords, [key]: event.target.value }), 'aria-invalid': passwordErrors[key] ? 'true' : undefined });

    return (
        <div className="grid gap-6 lg:grid-cols-2">
            <form onSubmit={saveProfile} noValidate className="flex flex-col gap-4">
                <h3 className="text-sm font-semibold text-ink">{t('بياناتي')}</h3>
                <Field label={t('الاسم بالكامل')} required error={profileErrors.full_name}>
                    {(props) => <Input {...props} {...bindProfile('full_name')} maxLength={255} />}
                </Field>
                <Field label={t('رقم الهاتف')} required error={profileErrors.phone} hint={t('تستخدمه أو بريدك لتسجيل الدخول.')}>
                    {(props) => <Input {...props} {...bindProfile('phone')} dir="ltr" className="text-start" inputMode="tel" />}
                </Field>
                <Field label={t('البريد الإلكتروني')} required error={profileErrors.email}>
                    {(props) => <Input {...props} {...bindProfile('email')} dir="ltr" className="text-start" type="email" />}
                </Field>
                <Button type="submit" loading={savingProfile} icon="check" className="self-end">
                    {t('حفظ بياناتي')}
                </Button>
            </form>

            <form onSubmit={savePassword} noValidate className="flex flex-col gap-4">
                <h3 className="text-sm font-semibold text-ink">{t('تغيير كلمة المرور')}</h3>
                <Field label={t('كلمة المرور الحالية')} required error={passwordErrors.current_password}>
                    {(props) => <PasswordInput {...props} {...bindPassword('current_password')} autoComplete="current-password" />}
                </Field>
                <Field label={t('كلمة المرور الجديدة')} required error={passwordErrors.password}>
                    {(props) => <PasswordInput {...props} {...bindPassword('password')} showStrength autoComplete="new-password" placeholder={t('8 أحرف على الأقل')} />}
                </Field>
                <Field label={t('تأكيد كلمة المرور الجديدة')} required error={passwordErrors.password_confirmation}>
                    {(props) => <PasswordInput {...props} {...bindPassword('password_confirmation')} autoComplete="new-password" />}
                </Field>
                <Alert tone="info">{t('سيتم تسجيل خروجك من جميع الأجهزة الأخرى.')}</Alert>
                <Button type="submit" loading={savingPassword} icon="lock" className="self-end" disabled={!passwords.current_password || !passwords.password}>
                    {t('تغيير كلمة المرور')}
                </Button>
            </form>
        </div>
    );
}

/** Store settings in tabs (?tab=store|contact|orders|payments|policies|domain|tracking|account) */
export function SettingsPage() {
    const { updateVendor, can } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const tabs = TABS.filter((item) => !item.permission || can(item.permission));
    const tab = tabs.some((item) => item.value === searchParams.get('tab')) ? searchParams.get('tab') : tabs[0].value;
    const [settings, setSettings] = useState(null);
    const [error, setError] = useState(null);

    const load = () => {
        setError(null);
        storeSettingsApi
            .get()
            .then(setSettings)
            .catch((loadError) => setError(loadError.message));
    };

    // Staff without the settings permission only reach the account and payments tabs.
    useEffect(() => {
        if (can('settings')) {
            load();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // The sidebar shows the store's name and logo from the session.
    const onSaved = (updated) => {
        setSettings(updated);
        updateVendor({ store: { name: updated.name, logo_url: updated.logo_url, governorate_id: updated.governorate_id, city_id: updated.city_id, contact_phone: updated.contact_phone, address: updated.address } });
    };

    const TabContent = { store: StoreTab, contact: ContactTab, orders: OrdersTab, policies: PoliciesTab }[tab];

    return (
        <>
            <PageHeader title={t('إعدادات المتجر')} description={t('بيانات متجرك وطرق الدفع وطريقة تواصل العملاء معك وسياساتك')} breadcrumbs={[t('لوحة التحكم'), t('الإدارة'), t('إعدادات المتجر')]} />

            {/* Side menu of sections from lg; the open section's form fills the column beside it. */}
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[232px_minmax(0,1fr)]">
                <nav aria-label={t('إعدادات المتجر')} className="mk-card min-w-0 p-2 lg:sticky lg:top-24">
                    <Tabs variant="vertical" tabs={tabs} value={tab} onChange={(value) => setSearchParams(value === 'store' ? {} : { tab: value }, { replace: true })} />
                </nav>
                <section className="mk-card min-w-0 overflow-hidden">
                    <header className="flex items-center gap-3 border-b border-line px-5 py-4 sm:px-6">
                        <span className="grid size-9 place-items-center rounded-lg bg-primary-soft text-brand-green ring-1 ring-primary/10 ring-inset">
                            <Icon name={tabs.find((item) => item.value === tab)?.icon ?? 'settings'} className="size-[18px]" />
                        </span>
                        <h2 className="text-base font-semibold text-ink">{tabs.find((item) => item.value === tab)?.label}</h2>
                    </header>
                    <div className="p-5 sm:p-6">
                        {tab === 'account' ? (
                            <AccountTab />
                        ) : tab === 'domain' ? (
                            <DomainTab />
                        ) : tab === 'tracking' ? (
                            <TrackingTab />
                        ) : tab === 'payments' ? (
                            <PaymentSettingsTab />
                        ) : error ? (
                            <EmptyState icon="alert-triangle" title={t('تعذر تحميل الإعدادات')} description={error} action={<Button variant="secondary" icon="refresh" onClick={load}>{t('إعادة المحاولة')}</Button>} />
                        ) : !settings ? (
                            <div className="flex flex-col gap-4">
                                <Skeleton className="h-20 w-full" />
                                <Skeleton className="h-40 w-full" />
                            </div>
                        ) : (
                            <TabContent settings={settings} onSaved={onSaved} />
                        )}
                    </div>
                </section>
            </div>
        </>
    );
}
