import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Badge, EmptyState } from '@/components/ui/Display';
import { Input, Textarea } from '@/components/ui/Form';
import { Pagination, Tabs } from '@/components/ui/Navigation';
import { Skeleton } from '@/components/ui/Spinner';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useToast } from '@/context/ToastContext';
import { BILLING_METHODS } from '@/features/billing/billing';
import { t } from '@/i18n';
import { formatDate, formatMoney } from '@/lib/format';
import { adminApi } from '@/services/adminApi';

const STATUS_TABS = [
    { value: 'pending', label: t('بانتظار المراجعة') },
    { value: 'approved', label: t('تمت الموافقة') },
    { value: 'rejected', label: t('مرفوضة') },
];

const STATUS_BADGES = { pending: 'warning', approved: 'success', rejected: 'danger' };

/** Vendors' "I paid" requests: check the transfer, then approve (activates the plan) or reject. */
export function AdminRequestsPage() {
    const { can } = useAdminAuth();
    const toast = useToast();
    const [status, setStatus] = useState('pending');
    const [page, setPage] = useState(1);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [approving, setApproving] = useState(null);
    const [amount, setAmount] = useState('');
    const [rejecting, setRejecting] = useState(null);
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);

    const load = useCallback(() => {
        setError(null);
        adminApi
            .requests({ status, page })
            .then(setResult)
            .catch((loadError) => setError(loadError.message));
    }, [status, page]);

    useEffect(load, [load]);

    const act = async (action, message) => {
        setBusy(true);

        try {
            await action();
            toast.success(message);
            setApproving(null);
            setRejecting(null);
            load();
        } catch (actionError) {
            toast.error(t('تعذر تنفيذ الإجراء'), Object.values(actionError.errors ?? {})[0] ?? actionError.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <PageHeader title={t('طلبات الاشتراك')} description={t('تأكد من وصول التحويل قبل الموافقة؛ الموافقة تفعّل الباقة فوراً')} />

            <section className="mk-card overflow-hidden">
                <Tabs
                    tabs={STATUS_TABS}
                    value={status}
                    onChange={(value) => {
                        setStatus(value);
                        setPage(1);
                    }}
                    className="px-3"
                />

                {error ? (
                    <div className="p-6">
                        <EmptyState icon="alert-triangle" title={t('تعذر تحميل الطلبات')} description={error} action={<Button variant="secondary" icon="refresh" onClick={load}>{t('إعادة المحاولة')}</Button>} />
                    </div>
                ) : !result ? (
                    <div className="flex flex-col gap-3 p-4">
                        {[0, 1, 2].map((index) => (
                            <Skeleton key={index} className="h-16 w-full" />
                        ))}
                    </div>
                ) : result.data.length === 0 ? (
                    <div className="p-6">
                        <EmptyState icon="send" title={t('لا توجد طلبات')} />
                    </div>
                ) : (
                    <ul className="divide-y divide-line border-t border-line">
                        {result.data.map((item) => (
                            <li key={item.request_id} className="flex flex-wrap items-center gap-4 px-4 py-4">
                                <div className="min-w-0 flex-1">
                                    <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                                        {item.store?.name}
                                        <Badge tone={STATUS_BADGES[item.status]}>{STATUS_TABS.find((tab) => tab.value === item.status)?.label}</Badge>
                                    </p>
                                    <p className="mt-0.5 text-sm text-ink-2">
                                        {t('{plan} · {count} شهر · {amount}', { plan: item.plan?.name, count: item.months, amount: formatMoney(item.amount) })}
                                    </p>
                                    <p className="mt-0.5 text-xs text-muted">
                                        {BILLING_METHODS[item.method]} · <span className="ltr font-mono">{item.reference}</span> · {formatDate(item.created_at)}
                                    </p>
                                    {item.notes && <p className="mt-1 text-xs text-ink-2">{item.notes}</p>}
                                    {item.review_note && <p className="mt-1 text-xs text-danger">{item.review_note}</p>}
                                </div>
                                {item.status === 'pending' && can('subscriptions.manage') && (
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="success"
                                            icon="check"
                                            onClick={() => {
                                                setApproving(item);
                                                setAmount(String(item.amount));
                                            }}
                                        >
                                            {t('موافقة')}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="danger-soft"
                                            icon="x"
                                            onClick={() => {
                                                setRejecting(item);
                                                setNote('');
                                            }}
                                        >
                                            {t('رفض')}
                                        </Button>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}

                {result && result.meta.total > result.meta.per_page && (
                    <div className="border-t border-line px-4 py-3">
                        <Pagination meta={result.meta} onPageChange={setPage} />
                    </div>
                )}
            </section>

            <ConfirmDialog
                open={Boolean(approving)}
                onClose={() => setApproving(null)}
                onConfirm={() => act(() => adminApi.approve(approving.request_id, Number(amount)), t('تم تفعيل الباقة'))}
                loading={busy}
                tone="primary"
                icon="check-circle"
                title={t('تأكيد وصول التحويل؟')}
                description={approving ? t('سيتم تفعيل باقة {plan} لمتجر {store} لمدة {count} شهر.', { plan: approving.plan?.name, store: approving.store?.name, count: approving.months }) : ''}
                confirmLabel={t('موافقة وتفعيل')}
            >
                <Input type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} dir="ltr" className="mt-3 text-start" aria-label={t('المبلغ المستلم')} />
            </ConfirmDialog>
            <ConfirmDialog
                open={Boolean(rejecting)}
                onClose={() => setRejecting(null)}
                onConfirm={() => act(() => adminApi.reject(rejecting.request_id, note), t('تم رفض الطلب'))}
                loading={busy}
                icon="x"
                title={t('رفض الطلب؟')}
                description={t('سيصل لصاحب المتجر إشعار بالسبب.')}
                confirmLabel={t('رفض')}
            >
                <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder={t('مثال: لم يصل التحويل إلى الحساب')} maxLength={255} className="mt-3" aria-label={t('سبب الرفض')} />
            </ConfirmDialog>
        </>
    );
}
