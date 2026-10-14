import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Alert, EmptyState, StatCard } from '@/components/ui/Display';
import { Field, Input, Switch } from '@/components/ui/Form';
import { Skeleton } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { t } from '@/i18n';
import { formatMoney, formatNumber } from '@/lib/format';
import { loyaltyApi } from '@/services/loyaltyApi';

/** Loyalty points: customers earn on delivered orders and spend points as a checkout discount. */
export function LoyaltyPage() {
    const { can } = useAuth();
    const toast = useToast();
    const [data, setData] = useState(null);
    const [form, setForm] = useState(null);
    const [errors, setErrors] = useState({});
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);

    const apply = (loaded) => {
        setData(loaded);
        setForm({ ...loaded.settings });
        setErrors({});
    };

    const load = () => {
        setError(null);
        loyaltyApi
            .get()
            .then(apply)
            .catch((loadError) => setError(loadError.message));
    };

    useEffect(load, []);

    const save = async (event) => {
        event.preventDefault();
        setSaving(true);

        try {
            apply(await loyaltyApi.update({ ...form, loyalty_earn_rate: Number(form.loyalty_earn_rate), loyalty_point_value: Number(form.loyalty_point_value), loyalty_min_redeem: Number(form.loyalty_min_redeem) }));
            toast.success(t('تم حفظ برنامج النقاط'));
        } catch (saveError) {
            setErrors(saveError.errors ?? {});
            toast.error(t('تعذر حفظ برنامج النقاط'), Object.values(saveError.errors ?? {})[0] ?? saveError.message);
        } finally {
            setSaving(false);
        }
    };

    const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

    // Points per 100 EGP × EGP per point = EGP back per 100 EGP, i.e. the cashback percentage.
    const cashbackPercent = form ? Number(form.loyalty_earn_rate) * Number(form.loyalty_point_value) : 0;
    const stats = data?.stats;

    return (
        <>
            <PageHeader title={t('برنامج النقاط')} description={t('العميل يكسب نقاطاً على كل طلب يستلمه ويستخدمها كخصم في طلبه القادم، فيرجع يشتري منك تاني')} breadcrumbs={[t('لوحة التحكم'), t('التسويق'), t('برنامج النقاط')]} />

            {error ? (
                <EmptyState icon="alert-triangle" title={t('تعذر تحميل برنامج النقاط')} description={error} action={<Button variant="secondary" icon="refresh" onClick={load}>{t('إعادة المحاولة')}</Button>} />
            ) : !data ? (
                <div className="flex flex-col gap-4">
                    <Skeleton className="h-24 w-full rounded-xl" />
                    <Skeleton className="h-72 w-full rounded-xl" />
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard label={t('عملاء لديهم نقاط')} value={formatNumber(stats.members)} icon="users" tone="primary" />
                        <StatCard label={t('نقاط لم تُستخدم بعد')} value={formatNumber(stats.outstanding_points)} icon="star" tone="warning" hint={t('قيمتها {amount} خصومات مستقبلية', { amount: formatMoney(stats.outstanding_value) })} />
                        <StatCard label={t('نقاط مكتسبة')} value={formatNumber(stats.earned_points)} icon="gift" tone="success" />
                        <StatCard label={t('نقاط مستخدمة')} value={formatNumber(stats.redeemed_points)} icon="check-circle" tone="info" />
                    </div>

                    {!data.available && (
                        <Alert tone="warning" icon="zap" title={t('برنامج النقاط غير متاح في باقتك')}>
                            {t('رقِّ باقتك لتفعيل النقاط وتشجيع عملائك على تكرار الشراء.')}
                            <Button to="/dashboard/subscription" size="sm" variant="secondary" icon="zap" className="ms-2">
                                {t('ترقية الباقة')}
                            </Button>
                        </Alert>
                    )}

                    <form onSubmit={save} noValidate className="mk-card flex flex-col gap-5 p-5 sm:p-6">
                        <Switch
                            checked={form.loyalty_enabled}
                            disabled={!data.available || !can('marketing.update')}
                            onChange={(checked) => setForm((current) => ({ ...current, loyalty_enabled: checked }))}
                            label={t('تفعيل برنامج النقاط')}
                            description={t('عند الإيقاف لا يكسب العملاء نقاطاً جديدة ولا يستخدمون رصيدهم، ويبقى الرصيد محفوظاً.')}
                        />
                        {errors.loyalty_enabled && <p className="-mt-3 text-xs font-medium text-danger">{errors.loyalty_enabled}</p>}

                        <div className="grid gap-4 sm:grid-cols-3">
                            <Field label={t('نقاط لكل ١٠٠ جنيه')} error={errors.loyalty_earn_rate} hint={t('من قيمة المنتجات بعد الخصومات، عند توصيل الطلب.')}>
                                {(props) => <Input {...props} type="number" min="1" value={form.loyalty_earn_rate} onChange={set('loyalty_earn_rate')} dir="ltr" />}
                            </Field>
                            <Field label={t('قيمة النقطة (جنيه)')} error={errors.loyalty_point_value} hint={t('الخصم الذي تعطيه كل نقطة عند إتمام الطلب.')}>
                                {(props) => <Input {...props} type="number" min="0.01" step="0.01" value={form.loyalty_point_value} onChange={set('loyalty_point_value')} dir="ltr" />}
                            </Field>
                            <Field label={t('أقل عدد نقاط للاستخدام')} error={errors.loyalty_min_redeem}>
                                {(props) => <Input {...props} type="number" min="1" value={form.loyalty_min_redeem} onChange={set('loyalty_min_redeem')} dir="ltr" />}
                            </Field>
                        </div>

                        <Alert tone="info" icon="info">
                            {t('بهذه الإعدادات: طلب منتجاته بـ ١٠٠٠ جنيه يكسب {points} نقطة = خصم {amount} على الطلب القادم (استرجاع {percent}%).', {
                                points: formatNumber(Math.floor(Number(form.loyalty_earn_rate) * 10)),
                                amount: formatMoney(Math.floor(Number(form.loyalty_earn_rate) * 10) * Number(form.loyalty_point_value)),
                                percent: formatNumber(Math.round(cashbackPercent * 100) / 100),
                            })}
                        </Alert>

                        {can('marketing.update') && (
                            <Button type="submit" icon="check" loading={saving} className="self-start">
                                {t('حفظ')}
                            </Button>
                        )}
                    </form>
                </div>
            )}
        </>
    );
}
