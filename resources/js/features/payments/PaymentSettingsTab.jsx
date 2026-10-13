import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Alert, Badge, EmptyState } from '@/components/ui/Display';
import { Field, Input, PasswordInput, Switch } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';
import { useCopy } from '@/hooks/common';
import { t } from '@/i18n';
import { PAYMENT_METHODS } from '@/lib/constants';
import { formatDate } from '@/lib/format';
import { storeSettingsApi } from '@/services/storeSettingsApi';

const EMPTY_FORM = { secret_key: '', public_key: '', hmac_secret: '', card_integration_id: '', wallet_integration_id: '' };

/** Where each value lives in the Paymob dashboard. */
const GUIDE = [
    { title: t('Secret Key و Public Key'), text: t('من لوحة Paymob افتح Settings ثم Account Info، وانسخ المفتاحين. المفاتيح التي تبدأ بـ test للتجربة، و live للدفع الحقيقي.') },
    { title: t('HMAC Secret'), text: t('في نفس الصفحة (Account Info) تحت HMAC. نستخدمه للتأكد أن إشعارات الدفع قادمة من Paymob فعلاً.') },
    { title: t('Integration ID'), text: t('من Developers ثم Payment Integrations: لكل طريقة دفع (Online Card أو Mobile Wallet) رقم Integration ID. أدخل رقم كل طريقة تريد تفعيلها.') },
    { title: t('رابط الإشعارات (للمحافظ)'), text: t('Paymob ترسل نتيجة دفع الكروت تلقائياً. للمحافظ: افتح الـ Integration الخاص بها والصق رابط الإشعارات بالأسفل في Transaction processed callback.') },
];

function fieldErrors(error) {
    return Object.fromEntries(Object.entries(error.errors ?? {}).map(([key, message]) => [key.replace(/^paymob\./, ''), message]));
}

/** Settings → Payments: cash on delivery on/off and the store's own Paymob account. */
export function PaymentSettingsTab() {
    const toast = useToast();
    const { copy, copiedValue } = useCopy();
    const [settings, setSettings] = useState(null);
    const [loadError, setLoadError] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [togglingCod, setTogglingCod] = useState(false);
    const [disconnectOpen, setDisconnectOpen] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);

    const apply = (loaded) => {
        setSettings(loaded);
        setForm({
            ...EMPTY_FORM,
            public_key: loaded.paymob?.public_key ?? '',
            card_integration_id: loaded.paymob?.card_integration_id ?? '',
            wallet_integration_id: loaded.paymob?.wallet_integration_id ?? '',
        });
        setErrors({});
    };

    const load = () => {
        setLoadError(null);
        storeSettingsApi
            .payments()
            .then(apply)
            .catch((error) => setLoadError(error.message));
    };

    useEffect(load, []);

    if (loadError) {
        return <EmptyState icon="alert-triangle" title={t('تعذر تحميل إعدادات الدفع')} description={loadError} action={<Button variant="secondary" icon="refresh" onClick={load}>{t('إعادة المحاولة')}</Button>} />;
    }

    if (!settings) {
        return (
            <div className="flex flex-col gap-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    const connected = Boolean(settings.paymob);

    const bind = (key) => ({
        value: form[key],
        onChange: (event) => {
            setForm((current) => ({ ...current, [key]: event.target.value }));
            setErrors((current) => ({ ...current, [key]: undefined }));
        },
        'aria-invalid': errors[key] ? 'true' : undefined,
        dir: 'ltr',
        className: 'text-start',
        autoComplete: 'off',
        spellCheck: false,
    });

    const toggleCod = async (codEnabled) => {
        setTogglingCod(true);

        try {
            apply(await storeSettingsApi.updatePayments({ cod_enabled: codEnabled }));
            toast.success(codEnabled ? t('تم تفعيل الدفع عند الاستلام') : t('تم إيقاف الدفع عند الاستلام'));
        } catch (error) {
            toast.error(t('تعذر حفظ الإعدادات'), error.errors?.cod_enabled ?? error.message);
        } finally {
            setTogglingCod(false);
        }
    };

    const savePaymob = async (event) => {
        event.preventDefault();
        setSaving(true);

        try {
            // Blank secrets keep the saved ones.
            const paymob = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim() || null]).filter(([key, value]) => value !== null || !['secret_key', 'hmac_secret'].includes(key)));

            apply(await storeSettingsApi.updatePayments({ paymob }));
            toast.success(t('تم ربط Paymob بنجاح'), t('تحققنا من المفاتيح مع Paymob.'));
        } catch (error) {
            setErrors(fieldErrors(error));
            toast.error(t('تعذر ربط Paymob'), Object.values(fieldErrors(error))[0] ?? error.message);
        } finally {
            setSaving(false);
        }
    };

    const disconnect = async () => {
        setDisconnecting(true);

        try {
            apply(await storeSettingsApi.disconnectPaymob());
            setDisconnectOpen(false);
            toast.success(t('تم فصل Paymob'));
        } catch (error) {
            toast.error(t('تعذر فصل Paymob'), error.message);
        } finally {
            setDisconnecting(false);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3 rounded-xl border border-line p-4">
                <Switch checked={settings.cod_enabled} disabled={togglingCod} onChange={toggleCod} label={PAYMENT_METHODS.cod.label} description={t('يدفع العميل نقداً للمندوب. لا يمكن إيقافه إلا بعد ربط طريقة دفع أونلاين.')} />
                {errors.cod_enabled && <p className="text-xs font-medium text-danger">{errors.cod_enabled}</p>}
            </div>

            <form onSubmit={savePaymob} noValidate className="flex flex-col gap-5 rounded-xl border border-line p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                            <Icon name="credit-card" className="size-5" />
                        </span>
                        <div>
                            <h3 className="text-base font-semibold text-ink">{t('الدفع أونلاين عبر Paymob')}</h3>
                            <p className="mt-0.5 text-sm text-muted">{t('كروت ومحافظ إلكترونية. الفلوس تُحوَّل لحسابك على Paymob مباشرة.')}</p>
                        </div>
                    </div>
                    {connected ? (
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={settings.paymob.is_live ? 'success' : 'warning'} icon={settings.paymob.is_live ? 'check-circle' : 'info'}>
                                {settings.paymob.is_live ? t('مربوط · دفع حقيقي') : t('مربوط · وضع التجربة')}
                            </Badge>
                            {settings.paymob.verified_at && <span className="text-xs text-muted">{t('آخر تحقق {date}', { date: formatDate(settings.paymob.verified_at) })}</span>}
                        </div>
                    ) : (
                        <Badge>{t('غير مربوط')}</Badge>
                    )}
                </div>

                {connected && !settings.paymob.is_live && <Alert tone="warning">{t('المفاتيح الحالية تجريبية (test): يمكنك تجربة الدفع بكروت Paymob التجريبية، ولن تُخصم أموال حقيقية. استبدلها بمفاتيح live بعد تفعيل حسابك.')}</Alert>}

                {connected && (
                    <div className="flex flex-wrap gap-2">
                        {['card', 'wallet'].map((method) => (
                            <Badge key={method} tone={settings.methods.includes(method) ? 'primary' : 'neutral'} icon={PAYMENT_METHODS[method].icon}>
                                {settings.methods.includes(method) ? PAYMENT_METHODS[method].label : t('{method}: غير مفعّل', { method: PAYMENT_METHODS[method].label })}
                            </Badge>
                        ))}
                    </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Secret Key" required={!connected} error={errors.secret_key} hint={connected ? t('اتركه فارغاً للإبقاء على المحفوظ ({hint}).', { hint: settings.paymob.secret_key_hint }) : undefined}>
                        {(props) => <PasswordInput {...props} {...bind('secret_key')} placeholder="egy_sk_test_..." />}
                    </Field>
                    <Field label="Public Key" required error={errors.public_key}>
                        {(props) => <Input {...props} {...bind('public_key')} placeholder="egy_pk_test_..." />}
                    </Field>
                    <Field label="HMAC Secret" required={!connected} error={errors.hmac_secret} hint={connected ? t('اتركه فارغاً للإبقاء على المحفوظ ({hint}).', { hint: settings.paymob.hmac_secret_hint }) : undefined} className="sm:col-span-2">
                        {(props) => <PasswordInput {...props} {...bind('hmac_secret')} />}
                    </Field>
                    <Field label={t('Integration ID للكروت')} optional error={errors.card_integration_id}>
                        {(props) => <Input {...props} {...bind('card_integration_id')} inputMode="numeric" placeholder="4097558" />}
                    </Field>
                    <Field label={t('Integration ID للمحافظ')} optional error={errors.wallet_integration_id}>
                        {(props) => <Input {...props} {...bind('wallet_integration_id')} inputMode="numeric" placeholder="4097559" />}
                    </Field>
                </div>

                <div className="rounded-xl bg-surface-2 p-4">
                    <p className="text-sm font-medium text-ink">{t('رابط الإشعارات')}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <code className="ltr min-w-0 flex-1 truncate rounded-lg border border-line bg-surface px-3 py-2 text-start font-mono text-xs text-ink-2">{settings.webhook_url}</code>
                        <Button size="sm" variant={copiedValue === settings.webhook_url ? 'success' : 'secondary'} icon={copiedValue === settings.webhook_url ? 'check' : 'copy'} onClick={() => copy(settings.webhook_url)}>
                            {copiedValue === settings.webhook_url ? t('تم النسخ') : t('نسخ')}
                        </Button>
                    </div>
                    <p className="mt-2 text-xs text-muted">{t('مطلوب للمحافظ فقط: الصقه في Transaction processed callback الخاص بـ Integration المحافظ في لوحة Paymob.')}</p>
                </div>

                <details className="group rounded-xl border border-line">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 text-sm font-semibold text-ink">
                        <span className="flex items-center gap-2">
                            <Icon name="info" className="size-4 text-primary" />
                            {t('أين أجد هذه البيانات في Paymob؟')}
                        </span>
                        <Icon name="chevron-down" className="size-4 text-muted transition group-open:rotate-180" />
                    </summary>
                    <ol className="flex flex-col gap-3 border-t border-line p-4 text-sm">
                        {GUIDE.map((step, index) => (
                            <li key={step.title} className="flex gap-3">
                                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary">{index + 1}</span>
                                <span>
                                    <span className="block font-medium text-ink">{step.title}</span>
                                    <span className="text-ink-2">{step.text}</span>
                                </span>
                            </li>
                        ))}
                    </ol>
                    <p className="border-t border-line px-4 py-3 text-xs text-muted">
                        {t('لازم يكون حسابك على Paymob متفعّل (بعد التحقق من السجل التجاري والبطاقة الضريبية) لاستقبال دفع حقيقي.')}{' '}
                        <a href="https://accept.paymob.com/portal2/en/login" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                            {t('فتح لوحة Paymob')}
                            <Icon name="external-link" className="size-3.5" />
                        </a>
                    </p>
                </details>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                    {connected ? (
                        <Button variant="ghost" icon="trash" onClick={() => setDisconnectOpen(true)}>
                            {t('فصل Paymob')}
                        </Button>
                    ) : (
                        <span />
                    )}
                    <Button type="submit" loading={saving} icon="shield-check">
                        {connected ? t('حفظ والتحقق من المفاتيح') : t('ربط Paymob')}
                    </Button>
                </div>
            </form>

            <ConfirmDialog
                open={disconnectOpen}
                onClose={() => setDisconnectOpen(false)}
                onConfirm={disconnect}
                loading={disconnecting}
                icon="trash"
                title={t('فصل حساب Paymob؟')}
                description={t('لن يتمكن العملاء من الدفع أونلاين، وسيُفعَّل الدفع عند الاستلام تلقائياً. الطلبات التي لم تُدفع بعد ستُلغى عند انتهاء مهلتها.')}
                confirmLabel={t('فصل Paymob')}
            />
        </div>
    );
}
