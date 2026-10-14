import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Alert, Card, EmptyState } from '@/components/ui/Display';
import { Field, Input, Switch } from '@/components/ui/Form';
import { Skeleton } from '@/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';
import { BostaConnectionCard } from '@/features/shipping/BostaConnectionCard';
import { t } from '@/i18n';
import { CURRENCY } from '@/lib/constants';
import { cn } from '@/lib/format';
import { findGovernorate } from '@/lib/locations';
import { ordersApi } from '@/services/ordersApi';

const toField = (value) => (value === null || value === undefined ? '' : String(value));
const toNumber = (value) => (value === '' ? null : Number(value));

/** Delivery prices: a default price, per-governorate overrides or no delivery, free shipping. */
export function ShippingPage() {
    const toast = useToast();
    const [settings, setSettings] = useState(null);
    const [error, setError] = useState(null);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        ordersApi
            .shippingSettings()
            .then((loaded) =>
                setSettings({
                    default_shipping_price: toField(loaded.default_shipping_price),
                    free_shipping_threshold: toField(loaded.free_shipping_threshold),
                    rates: loaded.rates.map((rate) => ({ ...rate, price: toField(rate.price) })),
                }),
            )
            .catch((loadError) => setError(loadError.message));
    }, []);

    const setRate = (governorateId, patch) => setSettings((current) => ({ ...current, rates: current.rates.map((rate) => (rate.governorate_id === governorateId ? { ...rate, ...patch } : rate)) }));

    const save = async () => {
        setSaving(true);
        setErrors({});

        try {
            await ordersApi.saveShippingSettings({
                default_shipping_price: toNumber(settings.default_shipping_price),
                free_shipping_threshold: toNumber(settings.free_shipping_threshold),
                rates: settings.rates.map((rate) => ({ governorate_id: rate.governorate_id, is_enabled: rate.is_enabled, price: toNumber(rate.price) })),
            });
            toast.success(t('تم حفظ إعدادات الشحن'));
        } catch (saveError) {
            setErrors(saveError.errors ?? {});
            toast.error(t('تعذر حفظ الإعدادات'), Object.values(saveError.errors ?? {})[0] ?? saveError.message);
        } finally {
            setSaving(false);
        }
    };

    const header = (
        <PageHeader
            title={t('الشحن')}
            description={t('حدد أسعار التوصيل لكل محافظة، والمحافظات التي توصّل إليها')}
            breadcrumbs={[t('لوحة التحكم'), t('المبيعات'), t('الشحن')]}
            actions={
                settings && (
                    <Button icon="check" loading={saving} onClick={save}>
                        {t('حفظ الإعدادات')}
                    </Button>
                )
            }
        />
    );

    if (error) {
        return (
            <>
                {header}
                <EmptyState icon="alert-triangle" title={t('تعذر تحميل إعدادات الشحن')} description={error} />
            </>
        );
    }

    if (!settings) {
        return (
            <>
                {header}
                <Skeleton className="h-96 w-full rounded-2xl" />
            </>
        );
    }

    const money = <span className="px-2 text-sm text-muted">{CURRENCY}</span>;
    const servedCount = settings.rates.filter((rate) => rate.is_enabled && (rate.price !== '' || settings.default_shipping_price !== '')).length;

    return (
        <>
            {header}
            <div className="mb-6">
                <BostaConnectionCard />
            </div>
            <div className="grid items-start gap-6 xl:grid-cols-[1fr_360px]">
                <Card title={t('المحافظات')} description={t('{count} من {total} محافظة متاح لها التوصيل', { count: servedCount, total: settings.rates.length })} bodyClassName="p-0">
                    <ul className="divide-y divide-line">
                        {settings.rates.map((rate, index) => (
                            <li key={rate.governorate_id} className={cn('flex flex-wrap items-center gap-4 px-5 py-3', !rate.is_enabled && 'bg-surface-2')}>
                                <span className={cn('min-w-32 flex-1 text-sm font-medium', rate.is_enabled ? 'text-ink' : 'text-muted')}>{findGovernorate(rate.governorate_id)?.name}</span>
                                <div className="w-40">
                                    <Input
                                        type="number"
                                        min={0}
                                        inputMode="decimal"
                                        value={rate.price}
                                        onChange={(event) => setRate(rate.governorate_id, { price: event.target.value })}
                                        disabled={!rate.is_enabled}
                                        placeholder={settings.default_shipping_price !== '' ? t('الافتراضي ({price})', { price: settings.default_shipping_price }) : t('بدون سعر')}
                                        aria-label={t('سعر الشحن إلى {name}', { name: findGovernorate(rate.governorate_id)?.name })}
                                        aria-invalid={errors[`rates.${index}.price`] ? 'true' : undefined}
                                        className="h-9 text-sm"
                                        suffix={money}
                                    />
                                </div>
                                <Switch checked={rate.is_enabled} onChange={(enabled) => setRate(rate.governorate_id, { is_enabled: enabled })} id={`ship-${rate.governorate_id}`} />
                            </li>
                        ))}
                    </ul>
                </Card>

                <div className="flex flex-col gap-6 xl:sticky xl:top-24">
                    <Card title={t('السعر الافتراضي')}>
                        <Field label={t('سعر الشحن الافتراضي')} optional error={errors.default_shipping_price} hint={t('يُطبّق على المحافظات المفعّلة التي لم تحدد لها سعراً. اتركه فارغاً لتوصّل فقط للمحافظات المحدد سعرها.')}>
                            {(props) => <Input {...props} type="number" min={0} value={settings.default_shipping_price} onChange={(event) => setSettings((current) => ({ ...current, default_shipping_price: event.target.value }))} suffix={money} />}
                        </Field>
                    </Card>
                    <Card title={t('الشحن المجاني')}>
                        <Field label={t('شحن مجاني للطلبات من')} optional error={errors.free_shipping_threshold} hint={t('اتركه فارغاً لإيقاف الشحن المجاني.')}>
                            {(props) => <Input {...props} type="number" min={0} value={settings.free_shipping_threshold} onChange={(event) => setSettings((current) => ({ ...current, free_shipping_threshold: event.target.value }))} suffix={money} />}
                        </Field>
                    </Card>
                    {servedCount === 0 && <Alert tone="warning">{t('لن يتمكن العملاء من إتمام الطلب حتى تحدد سعر شحن واحد على الأقل.')}</Alert>}
                </div>
            </div>
        </>
    );
}
