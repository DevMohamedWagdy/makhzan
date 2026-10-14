import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Alert, Badge, Card, EmptyState } from '@/components/ui/Display';
import { Field, Input, OptionCards, Textarea } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Overlay';
import { Skeleton } from '@/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';
import { BILLING_METHODS, PERIODS, PLAN_FEATURES, formatLimit, formatPlanPrice, priceFor } from '@/features/billing/billing';
import { useCopy } from '@/hooks/common';
import { t } from '@/i18n';
import { cn, formatDate, formatMoney } from '@/lib/format';
import { subscriptionApi } from '@/services/subscriptionApi';

/** The owner's plan, usage and renewal: pick a plan, transfer the fee, send the reference. */
export function SubscriptionPage() {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [choosing, setChoosing] = useState(null);

    const load = useCallback(() => {
        setError(null);
        subscriptionApi
            .get()
            .then(setData)
            .catch((loadError) => setError(loadError.message));
    }, []);

    useEffect(load, [load]);

    return (
        <>
            <PageHeader title={t('الاشتراك والباقة')} description={t('باقتك الحالية واستهلاكك، وترقية الباقة أو تجديدها')} breadcrumbs={[t('لوحة التحكم'), t('الإدارة'), t('الاشتراك والباقة')]} />

            {error ? (
                <EmptyState icon="alert-triangle" title={t('تعذر تحميل الاشتراك')} description={error} action={<Button variant="secondary" icon="refresh" onClick={load}>{t('إعادة المحاولة')}</Button>} />
            ) : !data ? (
                <div className="flex flex-col gap-4">
                    <Skeleton className="h-36 w-full rounded-xl" />
                    <Skeleton className="h-72 w-full rounded-xl" />
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    {data.pending_request && (
                        <Alert tone="info" title={t('طلب تفعيل باقة {plan} قيد المراجعة', { plan: data.pending_request.plan.name })}>
                            {t('أرسلت بيانات تحويل {amount} يوم {date}. سنفعّل الباقة فور تأكيد التحويل.', { amount: formatMoney(data.pending_request.amount), date: formatDate(data.pending_request.created_at) })}
                        </Alert>
                    )}

                    <CurrentPlan data={data} />

                    <section>
                        <h2 className="mb-3 text-lg font-bold text-ink">{t('الباقات')}</h2>
                        <div className="grid gap-4 lg:grid-cols-3">
                            {data.plans.map((plan) => (
                                <PlanCard key={plan.plan_id} plan={plan} current={data.plan?.plan_id === plan.plan_id} disabled={Boolean(data.pending_request)} onChoose={() => setChoosing(plan)} />
                            ))}
                        </div>
                    </section>

                    {data.payments.length > 0 && (
                        <Card title={t('سجل المدفوعات')}>
                            <ul className="divide-y divide-line">
                                {data.payments.map((payment) => (
                                    <li key={payment.payment_id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                                        <span>
                                            <span className="block font-medium text-ink">{payment.plan_name}</span>
                                            <span className="text-xs text-muted">{t('من {from} إلى {to}', { from: formatDate(payment.starts_at), to: formatDate(payment.ends_at) })}</span>
                                        </span>
                                        <span className="text-end">
                                            <span className="block font-semibold text-ink">{formatMoney(payment.amount)}</span>
                                            <span className="text-xs text-muted">{BILLING_METHODS[payment.method]}</span>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}
                </div>
            )}

            <RequestPlanModal
                plan={choosing}
                accounts={data?.payment_accounts ?? []}
                supportWhatsapp={data?.support_whatsapp}
                onClose={() => setChoosing(null)}
                onSent={() => {
                    setChoosing(null);
                    load();
                }}
            />
        </>
    );
}

function UsageBar({ label, used, limit }) {
    const percent = limit == null ? 0 : limit === 0 ? 100 : Math.min(100, Math.round((used / limit) * 100));

    return (
        <div>
            <div className="mb-1.5 flex justify-between text-sm">
                <span className="text-ink-2">{label}</span>
                <span className="font-semibold text-ink">{limit == null ? t('{used} (غير محدود)', { used }) : `${used} / ${limit}`}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                <div className={cn('h-full rounded-full transition-all', percent >= 100 ? 'bg-danger' : percent >= 80 ? 'bg-warning' : 'bg-primary')} style={{ width: `${limit == null ? 8 : percent}%` }} />
            </div>
        </div>
    );
}

function CurrentPlan({ data }) {
    const { plan, billing, usage } = data;

    if (billing.status === 'unrestricted') {
        return <Alert tone="info">{t('لا توجد باقات مفعّلة على المنصة بعد، ومتجرك يعمل بدون حدود.')}</Alert>;
    }

    if (billing.status !== 'active') {
        const expired = billing.status === 'expired';

        return (
            <section className={cn('mk-card flex flex-wrap items-center justify-between gap-4 p-6', expired && 'border-danger/40')}>
                <div>
                    <p className="text-sm text-muted">{t('باقتك الحالية')}</p>
                    <p className="mt-1 text-2xl font-bold text-ink">{expired ? t('انتهت الفترة التجريبية') : t('فترة تجريبية مجانية')}</p>
                    <p className={cn('mt-2 text-sm', expired ? 'text-danger' : 'text-muted')}>
                        {expired
                            ? t('انتهت في {date}. اختر باقة لتفتح لوحة التحكم ويستقبل متجرك الطلبات.', { date: formatDate(billing.trial_ends_at) })
                            : t('كل مميزات المنصة متاحة لك حتى {date} (متبقي {days} يوم). اختر باقتك قبل انتهائها.', { date: formatDate(billing.trial_ends_at), days: billing.days_left })}
                    </p>
                </div>
                <div className="flex gap-6 text-center">
                    <span>
                        <span className="block text-2xl font-bold text-ink">{usage.products}</span>
                        <span className="text-xs text-muted">{t('المنتجات')}</span>
                    </span>
                    <span>
                        <span className="block text-2xl font-bold text-ink">{usage.staff}</span>
                        <span className="text-xs text-muted">{t('فريق العمل')}</span>
                    </span>
                </div>
            </section>
        );
    }

    return (
        <section className="mk-card grid gap-6 p-6 md:grid-cols-2">
            <div>
                <p className="text-sm text-muted">{t('باقتك الحالية')}</p>
                <p className="mt-1 text-2xl font-bold text-ink">{plan.name}</p>
                <p className={cn('mt-2 text-sm', billing.days_left <= 7 ? 'text-warning' : 'text-muted')}>{t('تنتهي في {date} (متبقي {days} يوم)', { date: formatDate(billing.plan_expires_at), days: billing.days_left })}</p>
                <ul className="mt-4 flex flex-wrap gap-2">
                    {Object.entries(PLAN_FEATURES).map(([feature, config]) => (
                        <li key={feature}>
                            <Badge tone={plan.features.includes(feature) ? 'success' : 'neutral'} icon={plan.features.includes(feature) ? 'check' : 'x'}>
                                {config.label}
                            </Badge>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="flex flex-col justify-center gap-4">
                <UsageBar label={t('المنتجات')} used={usage.products} limit={plan.max_products} />
                <UsageBar label={t('فريق العمل')} used={usage.staff} limit={plan.max_staff} />
            </div>
        </section>
    );
}

function PlanCard({ plan, current, disabled, onChoose }) {
    return (
        <article className={cn('mk-card flex flex-col p-6', current && 'border-primary ring-4 ring-primary/10')}>
            <div className="flex items-start justify-between gap-2">
                <h3 className="text-lg font-bold text-ink">{plan.name}</h3>
                {current && <Badge tone="primary">{t('باقتك الحالية')}</Badge>}
            </div>
            {plan.description && <p className="mt-1 text-sm text-muted">{plan.description}</p>}
            <p className="mt-4 text-2xl font-bold text-ink">{formatPlanPrice(plan)}</p>
            {plan.price_yearly != null && <p className="text-xs text-success">{t('أو {price} سنوياً', { price: formatMoney(plan.price_yearly) })}</p>}

            <ul className="mt-5 flex flex-1 flex-col gap-2.5 text-sm">
                <li className="flex items-center gap-2 text-ink-2">
                    <Icon name="box" className="size-4 text-primary" />
                    {t('المنتجات: {value}', { value: formatLimit(plan.max_products) })}
                </li>
                <li className="flex items-center gap-2 text-ink-2">
                    <Icon name="users" className="size-4 text-primary" />
                    {t('فريق العمل: {value}', { value: formatLimit(plan.max_staff) })}
                </li>
                {Object.entries(PLAN_FEATURES).map(([feature, config]) => (
                    <li key={feature} className={cn('flex items-center gap-2', plan.features.includes(feature) ? 'text-ink-2' : 'text-muted line-through')}>
                        <Icon name={plan.features.includes(feature) ? 'check' : 'x'} className={cn('size-4', plan.features.includes(feature) ? 'text-success' : 'text-muted')} />
                        {config.label}
                    </li>
                ))}
            </ul>

            <Button className="mt-6 w-full" variant={current ? 'secondary' : 'primary'} icon={current ? 'refresh' : 'zap'} disabled={disabled} onClick={onChoose}>
                {current ? t('تجديد الباقة') : t('اشترك في {name}', { name: plan.name })}
            </Button>
        </article>
    );
}

function RequestPlanModal({ plan, accounts, supportWhatsapp, onClose, onSent }) {
    const toast = useToast();
    const { copy, copiedValue } = useCopy();
    const [months, setMonths] = useState(1);
    const [method, setMethod] = useState('');
    const [reference, setReference] = useState('');
    const [notes, setNotes] = useState('');
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (plan) {
            setMonths(1);
            setMethod(accounts[0]?.method ?? '');
            setReference('');
            setNotes('');
            setErrors({});
        }
    }, [plan, accounts]);

    if (!plan) {
        return null;
    }

    const amount = priceFor(plan, months);
    const account = accounts.find((item) => item.method === method);

    const submit = async (event) => {
        event.preventDefault();
        setSubmitting(true);

        try {
            await subscriptionApi.requestPlan({ plan_id: plan.plan_id, months, method, reference, notes: notes || null });
            toast.success(t('تم إرسال طلب التفعيل'), t('سنفعّل الباقة فور تأكيد التحويل.'));
            onSent();
        } catch (error) {
            setErrors(error.errors ?? {});
            toast.error(t('تعذر إرسال الطلب'), error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal open onClose={onClose} dismissible={!submitting} size="lg" icon="zap" title={t('الاشتراك في باقة {name}', { name: plan.name })}>
            <form onSubmit={submit} noValidate className="flex flex-col gap-5">
                <Field label={t('مدة الاشتراك')} error={errors.months}>
                    {() => <OptionCards columns={4} value={months} onChange={setMonths} options={PERIODS.map((period) => ({ ...period, description: formatMoney(priceFor(plan, period.value)) }))} />}
                </Field>

                {accounts.length === 0 ? (
                    <Alert tone="warning">
                        {t('لم تُضف طرق الدفع بعد. تواصل مع الدعم لإتمام الاشتراك.')}
                        {supportWhatsapp && (
                            <a href={`https://wa.me/${supportWhatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="ms-1 font-semibold underline">
                                {t('واتساب الدعم')}
                            </a>
                        )}
                    </Alert>
                ) : (
                    <>
                        <Field label={t('طريقة الدفع')} error={errors.method}>
                            {() => <OptionCards columns={accounts.length >= 3 ? 3 : accounts.length} value={method} onChange={setMethod} options={accounts.map((item) => ({ value: item.method, label: item.label }))} />}
                        </Field>
                        {account && (
                            <div className="rounded-xl border border-line bg-surface-2 p-4">
                                <p className="text-sm text-ink-2">{t('حوّل {amount} إلى:', { amount: formatMoney(amount) })}</p>
                                <div className="mt-2 flex items-center justify-between gap-3">
                                    <span dir="ltr" className="font-mono text-lg font-bold text-ink">{account.account}</span>
                                    <Button size="sm" variant="secondary" icon={copiedValue === account.account ? 'check' : 'copy'} onClick={() => copy(account.account)}>
                                        {copiedValue === account.account ? t('تم النسخ') : t('نسخ')}
                                    </Button>
                                </div>
                            </div>
                        )}
                        <Field label={t('رقم العملية أو الرقم المحوَّل منه')} required error={errors.reference} hint={t('نستخدمه للتأكد من وصول التحويل.')}>
                            {(props) => <Input {...props} value={reference} onChange={(event) => setReference(event.target.value)} dir="ltr" className="text-start" maxLength={100} />}
                        </Field>
                        <Field label={t('ملاحظات')} optional error={errors.notes}>
                            {(props) => <Textarea {...props} value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} />}
                        </Field>
                    </>
                )}

                {errors.plan_id && <Alert tone="danger">{errors.plan_id}</Alert>}

                <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
                    <span className="text-sm text-muted">
                        {t('الإجمالي')}: <span className="text-lg font-bold text-ink">{formatMoney(amount)}</span>
                    </span>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={onClose} disabled={submitting}>
                            {t('إلغاء')}
                        </Button>
                        <Button type="submit" loading={submitting} icon="send" disabled={accounts.length === 0 || !reference.trim()}>
                            {t('أرسلت المبلغ، فعّل الباقة')}
                        </Button>
                    </div>
                </div>
            </form>
        </Modal>
    );
}
