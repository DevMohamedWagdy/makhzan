import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Badge, EmptyState } from '@/components/ui/Display';
import { Checkbox, Field, Input, Switch } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Overlay';
import { Skeleton } from '@/components/ui/Spinner';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useToast } from '@/context/ToastContext';
import { PLAN_FEATURES, formatLimit, formatPlanPrice } from '@/features/billing/billing';
import { t } from '@/i18n';
import { cn, formatMoney, formatNumber } from '@/lib/format';
import { adminApi } from '@/services/adminApi';

const EMPTY = { name: '', description: '', price_monthly: '', price_yearly: '', max_products: '', max_staff: '', features: [], is_active: true, position: '' };

/** Subscription plans: prices, limits (blank = unlimited) and features. */
export function AdminPlansPage() {
    const { can } = useAdminAuth();
    const toast = useToast();
    const [plans, setPlans] = useState(null);
    const [error, setError] = useState(null);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(() => {
        setError(null);
        adminApi
            .plans()
            .then(setPlans)
            .catch((loadError) => setError(loadError.message));
    }, []);

    useEffect(load, [load]);

    const remove = async () => {
        setBusy(true);

        try {
            await adminApi.removePlan(deleting.plan_id);
            toast.success(t('تم حذف الباقة'));
            setDeleting(null);
            load();
        } catch (removeError) {
            toast.error(t('تعذر حذف الباقة'), removeError.errors?.plan ?? removeError.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <PageHeader
                title={t('الباقات')}
                description={t('المتاجر الجديدة تبدأ بفترة تجريبية كاملة، وبعدها تختار باقة من هنا')}
                actions={
                    can('plans.manage') && (
                        <Button icon="plus" onClick={() => setEditing({})}>
                            {t('باقة جديدة')}
                        </Button>
                    )
                }
            />

            {error ? (
                <EmptyState icon="alert-triangle" title={t('تعذر تحميل الباقات')} description={error} action={<Button variant="secondary" icon="refresh" onClick={load}>{t('إعادة المحاولة')}</Button>} />
            ) : !plans ? (
                <div className="grid gap-4 lg:grid-cols-3">
                    {[0, 1, 2].map((index) => (
                        <Skeleton key={index} className="h-56 rounded-xl" />
                    ))}
                </div>
            ) : plans.length === 0 ? (
                <EmptyState icon="zap" title={t('لا توجد باقات')} description={t('بدون باقات تعمل كل المتاجر بلا حدود. أضف الباقات المدفوعة لتبدأ الاشتراكات.')} action={<Button icon="plus" onClick={() => setEditing({})}>{t('باقة جديدة')}</Button>} />
            ) : (
                <div className="grid gap-4 lg:grid-cols-3">
                    {plans.map((plan) => (
                        <article key={plan.plan_id} className="mk-card flex flex-col p-5">
                            <div className="flex items-start justify-between gap-2">
                                <h3 className="text-lg font-bold text-ink">{plan.name}</h3>
                                <span className="flex gap-1">
                                    {!plan.is_active && <Badge tone="neutral">{t('متوقفة')}</Badge>}
                                </span>
                            </div>
                            <p className="mt-1 text-xl font-bold text-ink">{formatPlanPrice(plan)}</p>
                            {plan.price_yearly != null && <p className="text-xs text-muted">{t('سنوياً: {price}', { price: formatMoney(plan.price_yearly) })}</p>}
                            <ul className="mt-4 flex flex-1 flex-col gap-1.5 text-sm text-ink-2">
                                <li>{t('المنتجات: {value}', { value: formatLimit(plan.max_products) })}</li>
                                <li>{t('فريق العمل: {value}', { value: formatLimit(plan.max_staff) })}</li>
                                {plan.features.map((feature) => (
                                    <li key={feature}>✓ {PLAN_FEATURES[feature]?.label}</li>
                                ))}
                            </ul>
                            <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                                <span className="text-xs text-muted">{t('{count} متجر مشترك', { count: formatNumber(plan.stores_count ?? 0) })}</span>
                                <span className={cn('flex gap-1', !can('plans.manage') && 'hidden')}>
                                    <Button size="icon" variant="ghost" icon="edit" onClick={() => setEditing(plan)} aria-label={t('تعديل {name}', { name: plan.name })} />
                                    <Button size="icon" variant="ghost" icon="trash" onClick={() => setDeleting(plan)} aria-label={t('حذف {name}', { name: plan.name })} />
                                </span>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            <PlanFormModal
                plan={editing}
                onClose={() => setEditing(null)}
                onSaved={() => {
                    setEditing(null);
                    load();
                }}
            />
            <ConfirmDialog open={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={remove} loading={busy} icon="trash" title={t('حذف الباقة؟')} description={deleting ? t('سيتم حذف باقة {name} نهائياً.', { name: deleting.name }) : ''} confirmLabel={t('حذف')} />
        </>
    );
}

function PlanFormModal({ plan, onClose, onSaved }) {
    const toast = useToast();
    const [values, setValues] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const isEdit = Boolean(plan?.plan_id);

    useEffect(() => {
        if (plan) {
            setValues(isEdit ? Object.fromEntries(Object.keys(EMPTY).map((key) => [key, plan[key] ?? EMPTY[key]])) : EMPTY);
            setErrors({});
        }
    }, [plan, isEdit]);

    const set = (key, value) => {
        setValues((current) => ({ ...current, [key]: value }));
        setErrors((current) => ({ ...current, [key]: undefined }));
    };

    const numberOrNull = (value) => (value === '' || value == null ? null : Number(value));

    const submit = async (event) => {
        event.preventDefault();
        setSubmitting(true);

        try {
            await adminApi.savePlan(
                {
                    ...values,
                    price_monthly: Number(values.price_monthly || 0),
                    price_yearly: numberOrNull(values.price_yearly),
                    max_products: numberOrNull(values.max_products),
                    max_staff: numberOrNull(values.max_staff),
                    position: numberOrNull(values.position) ?? 0,
                    description: values.description || null,
                },
                isEdit ? plan.plan_id : null,
            );
            toast.success(isEdit ? t('تم حفظ الباقة') : t('تمت إضافة الباقة'));
            onSaved();
        } catch (error) {
            setErrors(error.errors ?? {});
            toast.error(t('تعذر حفظ الباقة'), error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal open={Boolean(plan)} onClose={onClose} dismissible={!submitting} size="lg" icon="zap" title={isEdit ? t('تعديل الباقة') : t('باقة جديدة')}>
            <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
                <Field label={t('اسم الباقة')} required error={errors.name ?? errors.slug}>
                    {(props) => <Input {...props} value={values.name} onChange={(event) => set('name', event.target.value)} data-autofocus maxLength={60} />}
                </Field>
                <Field label={t('الترتيب')} optional error={errors.position}>
                    {(props) => <Input {...props} type="number" min="0" value={values.position} onChange={(event) => set('position', event.target.value)} dir="ltr" className="text-start" />}
                </Field>
                <Field label={t('وصف قصير')} optional error={errors.description} className="sm:col-span-2">
                    {(props) => <Input {...props} value={values.description ?? ''} onChange={(event) => set('description', event.target.value)} maxLength={255} />}
                </Field>
                <Field label={t('السعر الشهري')} required error={errors.price_monthly}>
                    {(props) => <Input {...props} type="number" min="0" step="0.01" value={values.price_monthly} onChange={(event) => set('price_monthly', event.target.value)} dir="ltr" className="text-start" />}
                </Field>
                <Field label={t('السعر السنوي')} optional hint={t('فارغ = ١٢ × السعر الشهري')} error={errors.price_yearly}>
                    {(props) => <Input {...props} type="number" min="0" step="0.01" value={values.price_yearly ?? ''} onChange={(event) => set('price_yearly', event.target.value)} dir="ltr" className="text-start" />}
                </Field>
                <Field label={t('حد المنتجات')} optional hint={t('فارغ = غير محدود')} error={errors.max_products}>
                    {(props) => <Input {...props} type="number" min="0" value={values.max_products ?? ''} onChange={(event) => set('max_products', event.target.value)} dir="ltr" className="text-start" />}
                </Field>
                <Field label={t('حد فريق العمل')} optional hint={t('فارغ = غير محدود')} error={errors.max_staff}>
                    {(props) => <Input {...props} type="number" min="0" value={values.max_staff ?? ''} onChange={(event) => set('max_staff', event.target.value)} dir="ltr" className="text-start" />}
                </Field>
                <fieldset className="sm:col-span-2">
                    <legend className="mb-3 text-sm font-semibold text-ink">{t('المميزات')}</legend>
                    <div className="flex flex-col gap-3">
                        {Object.entries(PLAN_FEATURES).map(([feature, config]) => (
                            <Checkbox key={feature} label={config.label} checked={values.features.includes(feature)} onChange={() => set('features', values.features.includes(feature) ? values.features.filter((item) => item !== feature) : [...values.features, feature])} />
                        ))}
                    </div>
                </fieldset>
                <div className="flex flex-col gap-3 sm:col-span-2">
                    <Switch checked={values.is_active} onChange={(checked) => set('is_active', checked)} label={t('متاحة للاشتراك')} />
                </div>
                <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>
                        {t('إلغاء')}
                    </Button>
                    <Button type="submit" loading={submitting} icon="check">
                        {t('حفظ الباقة')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
