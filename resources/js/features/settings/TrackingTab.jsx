import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert, Badge, EmptyState } from '@/components/ui/Display';
import { Field, Input, PasswordInput, Switch } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';
import { t } from '@/i18n';
import { formatDate, formatTime } from '@/lib/format';
import { storeSettingsApi } from '@/services/storeSettingsApi';

/** The platforms, mirroring App\Enums\TrackingProvider, with where to find each value. */
const PROVIDERS = {
    meta: {
        name: t('ميتا (فيسبوك وإنستجرام)'),
        idLabel: t('Pixel ID'),
        idPlaceholder: '123456789012345',
        tokenLabel: t('Conversions API Access Token'),
        guide: t('من Events Manager اختر البيكسل: رقم الـ Pixel ID تحت اسمه، والتوكن من Settings ثم Conversions API ثم Generate access token.'),
        testCode: true,
    },
    tiktok: {
        name: t('تيك توك'),
        idLabel: t('Pixel Code'),
        idPlaceholder: 'C5ABCDEFGHIJKLMNOP12',
        tokenLabel: t('Events API Access Token'),
        guide: t('من TikTok Ads Manager افتح Assets ثم Events ثم Web Events: الكود بجانب اسم البيكسل، والتوكن من Settings ثم Generate Access Token.'),
        testCode: true,
    },
    google: {
        name: t('جوجل أناليتكس 4'),
        idLabel: t('Measurement ID'),
        idPlaceholder: 'G-AB12CD34EF',
        tokenLabel: t('Measurement Protocol API Secret'),
        guide: t('من Google Analytics افتح Admin ثم Data streams واختر موقعك: الـ Measurement ID أعلى الصفحة، والـ API Secret من Measurement Protocol API secrets.'),
        testCode: false,
    },
};

const formOf = (pixels) =>
    Object.fromEntries(Object.keys(PROVIDERS).map((provider) => [provider, { pixel_id: pixels[provider]?.pixel_id ?? '', access_token: '', test_event_code: pixels[provider]?.test_event_code ?? '', is_active: pixels[provider]?.is_active ?? true }]));

function DeliveryStatus({ pixel }) {
    if (!pixel?.has_access_token) {
        return null;
    }

    if (pixel.last_error) {
        return (
            <Alert tone="danger" icon="alert-triangle" title={t('آخر محاولة إرسال فشلت ({date})', { date: `${formatDate(pixel.last_error_at)} ${formatTime(pixel.last_error_at)}` })}>
                {pixel.last_error}
            </Alert>
        );
    }

    return pixel.last_sent_at ? (
        <p className="flex items-center gap-1.5 text-xs text-success">
            <Icon name="check-circle" className="size-4" />
            {t('آخر طلب أُرسل من السيرفر {date}', { date: `${formatDate(pixel.last_sent_at)} ${formatTime(pixel.last_sent_at)}` })}
        </p>
    ) : (
        <p className="text-xs text-muted">{t('لم يُرسل أي طلب بعد. سيظهر هنا نجاح أو فشل أول طلب.')}</p>
    );
}

/** Settings → Tracking: Meta, TikTok and GA4 pixels, plus their server-side tokens. */
export function TrackingTab() {
    const toast = useToast();
    const [settings, setSettings] = useState(null);
    const [loadError, setLoadError] = useState(null);
    const [form, setForm] = useState(null);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const apply = (loaded) => {
        setSettings(loaded);
        setForm(formOf(loaded.pixels));
        setErrors({});
    };

    const load = () => {
        setLoadError(null);
        storeSettingsApi
            .trackingPixels()
            .then(apply)
            .catch((error) => setLoadError(error.message));
    };

    useEffect(load, []);

    if (loadError) {
        return <EmptyState icon="alert-triangle" title={t('تعذر تحميل إعدادات التتبع')} description={loadError} action={<Button variant="secondary" icon="refresh" onClick={load}>{t('إعادة المحاولة')}</Button>} />;
    }

    if (!settings) {
        return (
            <div className="flex flex-col gap-4">
                {Object.keys(PROVIDERS).map((provider) => (
                    <Skeleton key={provider} className="h-40 w-full" />
                ))}
            </div>
        );
    }

    const set = (provider, key, value) => {
        setForm((current) => ({ ...current, [provider]: { ...current[provider], [key]: value } }));
        setErrors((current) => ({ ...current, [`pixels.${provider}.${key}`]: undefined }));
    };

    const save = async (event) => {
        event.preventDefault();
        setSaving(true);

        try {
            const pixels = Object.fromEntries(
                Object.entries(form).map(([provider, values]) => [
                    provider,
                    { pixel_id: values.pixel_id.trim(), is_active: values.is_active, test_event_code: values.test_event_code.trim() || null, ...(values.access_token.trim() ? { access_token: values.access_token.trim() } : {}) },
                ]),
            );

            apply(await storeSettingsApi.updateTrackingPixels(pixels));
            toast.success(t('تم حفظ إعدادات التتبع'), t('ستبدأ المنصات في استقبال زيارات وطلبات متجرك.'));
        } catch (error) {
            setErrors(error.errors ?? {});
            toast.error(t('تعذر حفظ إعدادات التتبع'), Object.values(error.errors ?? {})[0] ?? error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={save} noValidate className="flex flex-col gap-6">
            <Alert tone="info" icon="info" title={t('ليه التتبع مهم؟')}>
                {t('البيكسل يخبر فيسبوك وتيك توك وجوجل بمن اشترى من إعلاناتك، فتعرف أي إعلان يجيب مبيعات وتصبح إعلاناتك أرخص وأدق. يكفي أن تلصق المعرّف ونحن نرسل الزيارات والإضافة للسلة والطلبات تلقائياً.')}
            </Alert>

            {!settings.server_side_available && (
                <Alert tone="warning" icon="zap" title={t('الإرسال من السيرفر غير متاح في باقتك')}>
                    {t('البيكسل يعمل في كل الباقات. في الباقة الاحترافية نرسل الطلبات أيضاً من السيرفر (Conversions API)، فلا تضيع بسبب مانعات الإعلانات وقيود الآيفون، ونبلغ المنصات بالطلبات التي تم تسليمها فعلاً.')}
                    <Button to="/dashboard/subscription" size="sm" variant="secondary" icon="zap" className="ms-2">
                        {t('ترقية الباقة')}
                    </Button>
                </Alert>
            )}

            {Object.entries(PROVIDERS).map(([provider, config]) => {
                const saved = settings.pixels[provider];
                const values = form[provider];
                const error = (key) => errors[`pixels.${provider}.${key}`];
                const ltr = { dir: 'ltr', className: 'text-start', autoComplete: 'off', spellCheck: false };

                return (
                    <section key={provider} className="flex flex-col gap-4 rounded-xl border border-line p-4 sm:p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <h3 className="text-base font-semibold text-ink">{config.name}</h3>
                                <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-muted">{config.guide}</p>
                            </div>
                            {saved ? (
                                <Badge tone={saved.is_active ? 'success' : 'neutral'} dot>
                                    {saved.is_active ? (saved.has_access_token && settings.server_side_available ? t('مفعّل · متصفح وسيرفر') : t('مفعّل · متصفح')) : t('متوقف')}
                                </Badge>
                            ) : (
                                <Badge>{t('غير مربوط')}</Badge>
                            )}
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label={config.idLabel} error={error('pixel_id')} hint={saved ? t('امسحه واحفظ لفصل المنصة.') : undefined}>
                                {(props) => <Input {...props} {...ltr} value={values.pixel_id} onChange={(event) => set(provider, 'pixel_id', event.target.value)} placeholder={config.idPlaceholder} />}
                            </Field>
                            {settings.server_side_available && (
                                <Field label={config.tokenLabel} optional error={error('access_token')} hint={saved?.access_token_hint ? t('اتركه فارغاً للإبقاء على المحفوظ ({hint}).', { hint: saved.access_token_hint }) : t('لإرسال الطلبات من السيرفر.')}>
                                    {(props) => <PasswordInput {...props} {...ltr} value={values.access_token} onChange={(event) => set(provider, 'access_token', event.target.value)} />}
                                </Field>
                            )}
                            {config.testCode && settings.server_side_available && (
                                <Field label={t('Test Event Code')} optional error={error('test_event_code')} hint={t('للتجربة فقط: تظهر الأحداث في تبويب Test Events. امسحه بعد التأكد.')}>
                                    {(props) => <Input {...props} {...ltr} value={values.test_event_code} onChange={(event) => set(provider, 'test_event_code', event.target.value)} placeholder="TEST12345" />}
                                </Field>
                            )}
                        </div>

                        {saved && <Switch checked={values.is_active} onChange={(checked) => set(provider, 'is_active', checked)} label={t('تفعيل التتبع')} description={t('أوقفه مؤقتاً بدون حذف الإعدادات.')} />}
                        <DeliveryStatus pixel={saved} />
                    </section>
                );
            })}

            <Button type="submit" icon="check" loading={saving} className="self-start">
                {t('حفظ إعدادات التتبع')}
            </Button>
        </form>
    );
}
