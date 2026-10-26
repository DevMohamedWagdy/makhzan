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

const MAX_TIERS = 5;

const SUGGESTED_TIERS = [
    { name: t('برونزي'), min_spend: 0, multiplier: 1 },
    { name: t('فضي'), min_spend: 5000, multiplier: 1.25 },
    { name: t('ذهبي'), min_spend: 15000, multiplier: 1.5 },
];

/**
 * Loyalty points: customers earn on delivered orders and spend points as a checkout discount.
 * Optional tiers by delivered spend earn points faster.
 */
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
            apply(
                await loyaltyApi.update({
                    ...form,
                    loyalty_earn_rate: Number(form.loyalty_earn_rate),
                    loyalty_point_value: Number(form.loyalty_point_value),
                    loyalty_min_redeem: Number(form.loyalty_min_redeem),
                    loyalty_tiers: form.loyalty_tiers.map((tier) => ({ name: tier.name, min_spend: Number(tier.min_spend), multiplier: Number(tier.multiplier) })),
                }),
            );
            toast.success(t('تم حفظ برنامج النقاط'));
        } catch (saveError) {
            setErrors(saveError.errors ?? {});
            toast.error(t('تعذر حفظ برنامج النقاط'), Object.values(saveError.errors ?? {})[0] ?? saveError.message);
        } finally {
            setSaving(false);
        }
    };

    const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
    const setTiers = (update) => setForm((current) => ({ ...current, loyalty_tiers: update(current.loyalty_tiers) }));
    const setTier = (index, key) => (event) => setTiers((tiers) => tiers.map((tier, position) => (position === index ? { ...tier, [key]: event.target.value } : tier)));
    const addTier = () => setTiers((tiers) => [...tiers, { name: '', min_spend: '', multiplier: '' }]);
    const removeTier = (index) => setTiers((tiers) => tiers.filter((_, position) => position !== index));
    const canEdit = can('loyalty.update');

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
                    <div className="mk-stat-group sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard label={t('عملاء لديهم نقاط')} value={formatNumber(stats.members)} icon="users" tone="primary" />
                        <StatCard label={t('نقاط لم تُستخدم بعد')} value={formatNumber(stats.outstanding_points)} icon="star" tone="warning" hint={t('قيمتها {amount} خصومات مستقبلية', { amount: formatMoney(stats.outstanding_value) })} />
                        <StatCard label={t('نقاط مكتسبة')} value={formatNumber(stats.earned_points)} icon="gift" tone="success" />
                        <StatCard label={t('نقاط مستخدمة')} value={formatNumber(stats.redeemed_points)} icon="check-circle" tone="info" />
                    </div>

                    <form onSubmit={save} noValidate className="mk-card flex flex-col gap-5 p-5 sm:p-6">
                        <Switch
                            checked={form.loyalty_enabled}
                            disabled={!can('loyalty.update')}
                            onChange={(checked) => setForm((current) => ({ ...current, loyalty_enabled: checked }))}
                            label={t('تفعيل برنامج النقاط')}
                            description={t('عند الإيقاف لا يكسب العملاء نقاطاً جديدة ولا يستخدمون رصيدهم، ويبقى الرصيد محفوظاً.')}
                        />
                        {errors.loyalty_enabled && <p className="-mt-3 text-xs font-medium text-danger">{errors.loyalty_enabled}</p>}

                        <div className="grid gap-4 sm:grid-cols-3">
                            <Field label={t('نقاط لكل 100 جنيه')} error={errors.loyalty_earn_rate} hint={t('من قيمة المنتجات بعد الخصومات، عند توصيل الطلب.')}>
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
                            {t('بهذه الإعدادات: طلب منتجاته بـ 1000 جنيه يكسب {points} نقطة = خصم {amount} على الطلب القادم (استرجاع {percent}%).', {
                                points: formatNumber(Math.floor(Number(form.loyalty_earn_rate) * 10)),
                                amount: formatMoney(Math.floor(Number(form.loyalty_earn_rate) * 10) * Number(form.loyalty_point_value)),
                                percent: formatNumber(Math.round(cashbackPercent * 100) / 100),
                            })}
                        </Alert>

                        <div className="flex flex-col gap-3 border-t border-line pt-5">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                    <h3 className="font-semibold text-ink">{t('مستويات العملاء')}</h3>
                                    <p className="mt-0.5 text-sm text-ink-2">{t('كلما زادت مشتريات العميل المسلّمة ارتفع مستواه وكسب نقاطاً أكثر على طلباته التالية.')}</p>
                                </div>
                                {canEdit && form.loyalty_tiers.length === 0 && (
                                    <Button size="sm" variant="soft" icon="sparkles" onClick={() => setTiers(() => SUGGESTED_TIERS.map((tier) => ({ ...tier })))}>
                                        {t('استخدم المستويات المقترحة')}
                                    </Button>
                                )}
                            </div>
                            {errors.loyalty_tiers && <p className="text-xs font-medium text-danger">{errors.loyalty_tiers}</p>}

                            {form.loyalty_tiers.length === 0 ? (
                                <p className="rounded-xl border border-dashed border-line p-4 text-center text-sm text-muted">{t('لا توجد مستويات. كل العملاء يكسبون بنفس المعدل.')}</p>
                            ) : (
                                <ul className="flex flex-col gap-3">
                                    {form.loyalty_tiers.map((tier, index) => (
                                        <li key={index} className="grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-start">
                                            <Field label={t('اسم المستوى')} error={errors[`loyalty_tiers.${index}.name`]}>
                                                {(props) => <Input {...props} value={tier.name} maxLength={30} onChange={setTier(index, 'name')} disabled={!canEdit} placeholder={t('مثال: ذهبي')} />}
                                            </Field>
                                            <Field label={t('من مشتريات (جنيه)')} error={errors[`loyalty_tiers.${index}.min_spend`]}>
                                                {(props) => <Input {...props} type="number" min="0" value={tier.min_spend} onChange={setTier(index, 'min_spend')} disabled={!canEdit} dir="ltr" />}
                                            </Field>
                                            <Field
                                                label={t('مضاعف النقاط')}
                                                error={errors[`loyalty_tiers.${index}.multiplier`]}
                                                hint={Number(tier.multiplier) >= 1 ? t('{points} نقطة لكل 100 جنيه', { points: formatNumber(Math.floor(Number(form.loyalty_earn_rate) * Number(tier.multiplier) * 100) / 100) }) : undefined}
                                            >
                                                {(props) => <Input {...props} type="number" min="1" max="10" step="0.05" value={tier.multiplier} onChange={setTier(index, 'multiplier')} disabled={!canEdit} dir="ltr" />}
                                            </Field>
                                            {canEdit && (
                                                <Button size="icon" variant="ghost" icon="trash" onClick={() => removeTier(index)} aria-label={t('حذف المستوى')} className="sm:mt-6" />
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {canEdit && form.loyalty_tiers.length > 0 && form.loyalty_tiers.length < MAX_TIERS && (
                                <Button size="sm" variant="secondary" icon="plus" onClick={addTier} className="self-start">
                                    {t('إضافة مستوى')}
                                </Button>
                            )}
                        </div>

                        {canEdit && (
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
