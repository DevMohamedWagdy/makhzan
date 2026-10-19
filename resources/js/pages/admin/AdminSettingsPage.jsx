import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Alert, Card, EmptyState } from '@/components/ui/Display';
import { Field, Input, OptionCards, PasswordInput, Select } from '@/components/ui/Form';
import { Skeleton } from '@/components/ui/Spinner';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useToast } from '@/context/ToastContext';
import { t } from '@/i18n';
import { formatDate, formatTime } from '@/lib/format';
import { adminApi } from '@/services/adminApi';

const MAILERS = [
    { value: 'ses', label: 'Amazon SES', icon: 'send', description: t('للإنتاج: سريع ورخيص وموثوق') },
    { value: 'smtp', label: 'SMTP', icon: 'mail', description: t('أي مزود بريد آخر (Zoho، Gmail، ...)') },
];

const SES_REGIONS = ['eu-north-1', 'eu-central-1', 'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-south-1', 'me-south-1', 'me-central-1', 'us-east-1', 'us-east-2', 'us-west-2', 'ap-south-1'];

const FIELDS = ['mailer', 'from_address', 'from_name', 'ses_key', 'ses_region', 'smtp_host', 'smtp_port', 'smtp_username', 'smtp_encryption'];

/** Platform-wide settings the admin controls; for now the outgoing mail provider. */
export function AdminSettingsPage() {
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
                // Until a provider is saved here the .env one applies (locally often "log"); start the form on SES.
                const mailer = MAILERS.some((option) => option.value === result.mailer) ? result.mailer : 'ses';

                setValues({ ...Object.fromEntries(FIELDS.map((field) => [field, result[field] ?? ''])), mailer, ses_secret: '', smtp_password: '' });
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
            setValues((current) => ({ ...current, ses_secret: '', smtp_password: '' }));
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
        <>
            <PageHeader title={t('إعدادات المنصة')} description={t('إعدادات عامة تطبق على كل المنصة، مثل مزود إرسال البريد الإلكتروني')} />

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <form onSubmit={save} noValidate>
                    <Card
                        title={t('البريد الإلكتروني')}
                        description={settings.updated_at ? t('آخر تعديل: {date}', { date: `${formatDate(settings.updated_at)} ${formatTime(settings.updated_at)}` }) : t('تُستخدم إعدادات ملف .env حتى تحفظ هنا')}
                        bodyClassName="flex flex-col gap-5"
                    >
                        <fieldset disabled={!canUpdate || saving} className="flex flex-col gap-5">
                            <Field label={t('مزود الإرسال')} error={errors.mailer}>
                                {() => <OptionCards name="mailer" columns={2} options={MAILERS} value={values.mailer} onChange={set('mailer')} />}
                            </Field>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field label={t('بريد المرسل')} hint={t('يجب أن يكون على دومين موثق في المزود')} error={errors.from_address} required>
                                    {(props) => <Input {...props} value={values.from_address} onChange={set('from_address')} dir="ltr" className="text-start" placeholder="no-reply@sellygrow.com" />}
                                </Field>
                                <Field label={t('اسم المرسل')} error={errors.from_name} required>
                                    {(props) => <Input {...props} value={values.from_name} onChange={set('from_name')} placeholder="Sellygrow" />}
                                </Field>
                            </div>

                            {values.mailer === 'ses' && (
                                <div className="grid gap-4 rounded-xl border border-line bg-surface-2 p-4 sm:grid-cols-2">
                                    <Field label="Access key ID" error={errors.ses_key} required>
                                        {(props) => <Input {...props} value={values.ses_key} onChange={set('ses_key')} dir="ltr" className="text-start" autoComplete="off" placeholder="AKIA..." />}
                                    </Field>
                                    <Field label="Secret access key" hint={settings.has_ses_secret ? t('محفوظ. اتركه فارغاً للإبقاء عليه') : null} error={errors.ses_secret} required={!settings.has_ses_secret}>
                                        {(props) => <PasswordInput {...props} value={values.ses_secret} onChange={set('ses_secret')} autoComplete="off" placeholder={settings.has_ses_secret ? '••••••••' : ''} />}
                                    </Field>
                                    <Field label={t('المنطقة (Region)')} hint={t('نفس منطقة حساب SES، مثل Stockholm = eu-north-1')} error={errors.ses_region} required>
                                        {(props) => <Select {...props} value={values.ses_region} onChange={set('ses_region')} dir="ltr" options={[...new Set([values.ses_region, ...SES_REGIONS].filter(Boolean))].map((region) => ({ value: region, label: region }))} />}
                                    </Field>
                                </div>
                            )}

                            {values.mailer === 'smtp' && (
                                <div className="grid gap-4 rounded-xl border border-line bg-surface-2 p-4 sm:grid-cols-2">
                                    <Field label={t('الخادم (Host)')} error={errors.smtp_host} required>
                                        {(props) => <Input {...props} value={values.smtp_host} onChange={set('smtp_host')} dir="ltr" className="text-start" placeholder="smtp.zoho.com" />}
                                    </Field>
                                    <Field label={t('المنفذ (Port)')} error={errors.smtp_port} required>
                                        {(props) => <Input {...props} type="number" value={values.smtp_port} onChange={set('smtp_port')} dir="ltr" className="text-start" placeholder="587" />}
                                    </Field>
                                    <Field label={t('اسم المستخدم')} error={errors.smtp_username}>
                                        {(props) => <Input {...props} value={values.smtp_username} onChange={set('smtp_username')} dir="ltr" className="text-start" autoComplete="off" />}
                                    </Field>
                                    <Field label={t('كلمة المرور')} hint={settings.has_smtp_password ? t('محفوظة. اتركها فارغة للإبقاء عليها') : null} error={errors.smtp_password}>
                                        {(props) => <PasswordInput {...props} value={values.smtp_password} onChange={set('smtp_password')} autoComplete="off" placeholder={settings.has_smtp_password ? '••••••••' : ''} />}
                                    </Field>
                                    <Field label={t('التشفير')} error={errors.smtp_encryption}>
                                        {(props) => <Select {...props} value={values.smtp_encryption} onChange={set('smtp_encryption')} options={[{ value: 'tls', label: 'TLS (587)' }, { value: 'ssl', label: 'SSL (465)' }]} />}
                                    </Field>
                                </div>
                            )}

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

                <form onSubmit={sendTest} noValidate className="self-start">
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
        </>
    );
}
