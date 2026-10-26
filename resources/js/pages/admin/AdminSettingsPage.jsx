import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Alert, Card, EmptyState } from '@/components/ui/Display';
import { Field, Input, PasswordInput, Select, Textarea } from '@/components/ui/Form';
import { Tabs } from '@/components/ui/Navigation';
import { Skeleton } from '@/components/ui/Spinner';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useToast } from '@/context/ToastContext';
import { t } from '@/i18n';
import { formatDate, formatTime } from '@/lib/format';
import { builtInLegalText } from '@/pages/legal/legalDocuments';
import { adminApi } from '@/services/adminApi';

const FIELDS = ['from_address', 'from_name', 'smtp_host', 'smtp_port', 'smtp_username', 'smtp_encryption'];

const SITE_FIELDS = ['whatsapp', 'contact_email', 'terms_ar', 'terms_en', 'privacy_ar', 'privacy_en'];

const LEGAL_DOCUMENTS = [
    { value: 'terms', label: t('الشروط والأحكام') },
    { value: 'privacy', label: t('سياسة الخصوصية') },
];

/** Platform-wide settings the admin controls: the outgoing mail provider and the public website. */
export function AdminSettingsPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = searchParams.get('tab') === 'site' ? 'site' : 'mail';
    const tabs = [
        { value: 'mail', label: t('البريد الإلكتروني'), icon: 'mail' },
        { value: 'site', label: t('الموقع'), icon: 'link' },
    ];

    return (
        <>
            <PageHeader title={t('إعدادات المنصة')} description={t('إعدادات عامة تطبق على كل المنصة: مزود البريد الإلكتروني، وبيانات التواصل والصفحات القانونية في الموقع')} />
            <Tabs tabs={tabs} value={tab} onChange={(value) => setSearchParams(value === 'mail' ? {} : { tab: value }, { replace: true })} className="mb-6" />
            {tab === 'mail' ? <MailSettings /> : <SiteSettings />}
        </>
    );
}

/** The sender and SMTP server, plus a test message. */
function MailSettings() {
    const { can } = useAdminAuth();
    const toast = useToast();
    const canUpdate = can('settings.update');
    const [settings, setSettings] = useState(null);
    const [values, setValues] = useState(null);
    const [errors, setErrors] = useState({});
    const [loadError, setLoadError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [testEmail, setTestEmail] = useState('');
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);

    const load = () => {
        setLoadError(null);
        adminApi
            .mailSettings()
            .then((result) => {
                setSettings(result);
                setValues({ ...Object.fromEntries(FIELDS.map((field) => [field, result[field] ?? ''])), smtp_password: '' });
            })
            .catch((error) => setLoadError(error.message));
    };

    useEffect(load, []);

    const set = (field) => (event) => setValues((current) => ({ ...current, [field]: event?.target ? event.target.value : event }));

    const save = async (event) => {
        event.preventDefault();
        setErrors({});
        setSaving(true);

        try {
            const result = await adminApi.updateMailSettings({ ...values, smtp_port: values.smtp_port ? Number(values.smtp_port) : null });

            setSettings(result);
            setValues((current) => ({ ...current, smtp_password: '' }));
            toast.success(t('تم حفظ إعدادات البريد'));
        } catch (error) {
            setErrors(error.errors ?? {});
            toast.error(error.message);
        } finally {
            setSaving(false);
        }
    };

    const sendTest = async (event) => {
        event.preventDefault();
        setTestResult(null);
        setTesting(true);

        try {
            const result = await adminApi.testMail(testEmail.trim());

            setTestResult({ tone: 'success', message: result.message });
        } catch (error) {
            setTestResult({ tone: 'danger', message: error.errors?.email ?? error.message });
        } finally {
            setTesting(false);
        }
    };

    if (loadError) {
        return <EmptyState icon="alert-triangle" title={t('تعذر تحميل البيانات')} description={loadError} action={<Button variant="secondary" icon="refresh" onClick={load}>{t('إعادة المحاولة')}</Button>} />;
    }

    if (!values) {
        return (
            <div className="flex flex-col gap-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    return (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <form onSubmit={save} noValidate>
                <Card
                    title={t('البريد الإلكتروني')}
                    description={settings.updated_at ? t('آخر تعديل: {date}', { date: `${formatDate(settings.updated_at)} ${formatTime(settings.updated_at)}` }) : t('تُستخدم إعدادات ملف .env حتى تحفظ هنا')}
                    bodyClassName="flex flex-col gap-5"
                >
                    <fieldset disabled={!canUpdate || saving} className="flex flex-col gap-5">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label={t('بريد المرسل')} hint={t('يجب أن يكون على دومين موثق في المزود')} error={errors.from_address} required>
                                {(props) => <Input {...props} value={values.from_address} onChange={set('from_address')} dir="ltr" className="text-start" placeholder="no-reply@sellygrow.com" />}
                            </Field>
                            <Field label={t('اسم المرسل')} error={errors.from_name} required>
                                {(props) => <Input {...props} value={values.from_name} onChange={set('from_name')} placeholder="Sellygrow" />}
                            </Field>
                        </div>

                        <div className="grid gap-4 rounded-xl border border-line bg-surface-2 p-4 sm:grid-cols-2">
                            <Field label={t('الخادم (Host)')} hint={t('لـ Amazon SES: email-smtp.eu-north-1.amazonaws.com')} error={errors.smtp_host} required>
                                {(props) => <Input {...props} value={values.smtp_host} onChange={set('smtp_host')} dir="ltr" className="text-start" placeholder="smtp.zoho.com" />}
                            </Field>
                            <Field label={t('المنفذ (Port)')} error={errors.smtp_port} required>
                                {(props) => <Input {...props} type="number" value={values.smtp_port} onChange={set('smtp_port')} dir="ltr" className="text-start" placeholder="587" />}
                            </Field>
                            <Field label={t('اسم المستخدم')} error={errors.smtp_username}>
                                {(props) => <Input {...props} value={values.smtp_username} onChange={set('smtp_username')} dir="ltr" className="text-start" autoComplete="off" />}
                            </Field>
                            <Field label={t('كلمة المرور')} hint={settings.has_smtp_password ? t('محفوظة. اتركها فارغة للإبقاء عليها') : null} error={errors.smtp_password}>
                                {(props) => <PasswordInput {...props} value={values.smtp_password} onChange={set('smtp_password')} placeholder={settings.has_smtp_password ? '••••••••' : ''} />}
                            </Field>
                            <Field label={t('التشفير')} error={errors.smtp_encryption}>
                                {(props) => <Select {...props} value={values.smtp_encryption} onChange={set('smtp_encryption')} options={[{ value: 'tls', label: 'TLS (587)' }, { value: 'ssl', label: 'SSL (465)' }]} />}
                            </Field>
                        </div>
                    </fieldset>

                    {canUpdate && (
                        <div className="flex justify-end">
                            <Button type="submit" icon="check" loading={saving}>
                                {t('حفظ الإعدادات')}
                            </Button>
                        </div>
                    )}
                </Card>
            </form>

            <form onSubmit={sendTest} noValidate className="self-start xl:sticky xl:top-24">
                <Card title={t('رسالة تجريبية')} description={t('احفظ الإعدادات أولاً، ثم أرسل رسالة للتأكد أنها تعمل')} bodyClassName="flex flex-col gap-4">
                    {testResult && <Alert tone={testResult.tone}>{testResult.message}</Alert>}
                    <Field label={t('أرسل إلى')}>
                        {(props) => <Input {...props} type="email" value={testEmail} onChange={(event) => setTestEmail(event.target.value)} dir="ltr" className="text-start" placeholder="you@example.com" disabled={!canUpdate} />}
                    </Field>
                    <Button type="submit" variant="secondary" icon="send" loading={testing} disabled={!canUpdate || !testEmail.trim()} className="w-full">
                        {t('إرسال رسالة تجريبية')}
                    </Button>
                </Card>
            </form>
        </div>
    );
}

/** The public website: the footer's WhatsApp and email, and the Terms / Privacy text in both languages. */
function SiteSettings() {
    const { can } = useAdminAuth();
    const toast = useToast();
    const canUpdate = can('settings.update');
    const [settings, setSettings] = useState(null);
    const [values, setValues] = useState(null);
    const [errors, setErrors] = useState({});
    const [loadError, setLoadError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [documentName, setDocumentName] = useState('terms');

    const load = () => {
        setLoadError(null);
        adminApi
            .siteSettings()
            .then((result) => {
                setSettings(result);
                setValues(Object.fromEntries(SITE_FIELDS.map((field) => [field, result[field] ?? ''])));
            })
            .catch((error) => setLoadError(error.message));
    };

    useEffect(load, []);

    const set = (field) => (event) => setValues((current) => ({ ...current, [field]: event.target.value }));

    const startFromBuiltIn = () => {
        const field = `${documentName}_ar`;

        if (values[field].trim() && !window.confirm(t('سيُستبدل النص الحالي بالنص الافتراضي. هل تريد المتابعة؟'))) {
            return;
        }

        setValues((current) => ({ ...current, [field]: builtInLegalText(documentName) }));
    };

    const save = async (event) => {
        event.preventDefault();
        setErrors({});
        setSaving(true);

        try {
            const result = await adminApi.updateSiteSettings(Object.fromEntries(SITE_FIELDS.map((field) => [field, values[field].trim() || null])));

            setSettings(result);
            setValues(Object.fromEntries(SITE_FIELDS.map((field) => [field, result[field] ?? ''])));
            toast.success(t('تم حفظ إعدادات الموقع'));
        } catch (error) {
            setErrors(error.errors ?? {});
            toast.error(error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loadError) {
        return <EmptyState icon="alert-triangle" title={t('تعذر تحميل البيانات')} description={loadError} action={<Button variant="secondary" icon="refresh" onClick={load}>{t('إعادة المحاولة')}</Button>} />;
    }

    if (!values) {
        return (
            <div className="flex flex-col gap-4">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    const updatedAt = settings[`${documentName}_updated_at`];

    return (
        <form onSubmit={save} noValidate className="flex flex-col gap-6">
            <fieldset disabled={!canUpdate || saving} className="flex flex-col gap-6">
                <Card title={t('بيانات التواصل')} description={t('تظهر في أسفل الموقع؛ اترك الحقل فارغاً لإخفائه')} bodyClassName="grid gap-4 sm:grid-cols-2">
                    <Field label={t('رقم واتساب')} hint={t('بالصيغة الدولية مع كود الدولة، مثل 201001234567+')} error={errors.whatsapp}>
                        {(props) => <Input {...props} type="tel" value={values.whatsapp} onChange={set('whatsapp')} dir="ltr" className="text-start" placeholder="+20 100 123 4567" />}
                    </Field>
                    <Field label={t('البريد الإلكتروني للتواصل')} error={errors.contact_email}>
                        {(props) => <Input {...props} type="email" value={values.contact_email} onChange={set('contact_email')} dir="ltr" className="text-start" placeholder="hello@sellygrow.com" />}
                    </Field>
                </Card>

                <Card
                    title={t('الصفحات القانونية')}
                    description={updatedAt ? t('آخر تعديل: {date}', { date: `${formatDate(updatedAt)} ${formatTime(updatedAt)}` }) : t('يظهر النص الافتراضي حتى تحفظ نصاً هنا')}
                    actions={
                        <>
                            <Tabs variant="segmented" tabs={LEGAL_DOCUMENTS} value={documentName} onChange={setDocumentName} />
                            <Button to={`/${documentName}`} target="_blank" variant="ghost" size="sm" icon="external-link">
                                {t('معاينة')}
                            </Button>
                        </>
                    }
                    bodyClassName="flex flex-col gap-5"
                >
                    <Alert tone="info">{t('اكتب ## في بداية السطر لعنوان القسم، وكل سطر بعده فقرة. الأسطر قبل أول عنوان تظهر كمقدمة.')}</Alert>
                    <Field
                        label={t('النص العربي')}
                        error={errors[`${documentName}_ar`]}
                        action={
                            canUpdate && (
                                <Button variant="ghost" size="sm" icon="copy" onClick={startFromBuiltIn}>
                                    {t('البدء من النص الافتراضي')}
                                </Button>
                            )
                        }
                    >
                        {(props) => <Textarea {...props} rows={16} value={values[`${documentName}_ar`]} onChange={set(`${documentName}_ar`)} placeholder={t('اتركه فارغاً لعرض النص الافتراضي')} />}
                    </Field>
                    <Field label={t('النص الإنجليزي')} hint={t('يظهر لمن يتصفح الموقع بالإنجليزية؛ اتركه فارغاً لعرض النص الإنجليزي الافتراضي')} error={errors[`${documentName}_en`]}>
                        {(props) => <Textarea {...props} rows={12} value={values[`${documentName}_en`]} onChange={set(`${documentName}_en`)} dir="ltr" className="text-start" placeholder="## Section title" />}
                    </Field>
                </Card>
            </fieldset>

            {canUpdate && (
                <div className="flex justify-end">
                    <Button type="submit" icon="check" loading={saving}>
                        {t('حفظ إعدادات الموقع')}
                    </Button>
                </div>
            )}
        </form>
    );
}
