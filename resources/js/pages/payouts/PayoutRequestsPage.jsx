import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Avatar, EmptyState } from '@/components/ui/Display';
import { Pagination, Tabs } from '@/components/ui/Navigation';
import { Skeleton } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { PayoutStatusBadge } from '@/features/affiliates/PayoutHistory';
import { RecordPayoutModal, RejectPayoutDialog } from '@/features/affiliates/PayoutModals';
import { useAffiliateActions } from '@/features/affiliates/useAffiliateActions';
import { t } from '@/i18n';
import { PAYOUT_METHODS, PAYOUT_STATUSES } from '@/lib/constants';
import { formatDate, formatMoney, formatRelative } from '@/lib/format';
import { affiliatesApi } from '@/services/affiliatesApi';

const STATUS_KEYS = ['requested', 'paid', 'rejected'];

/** Store-wide commission transfers: open requests to confirm or reject, and the history. */
export function PayoutRequestsPage() {
    const { can } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const status = searchParams.has('status') ? searchParams.get('status') : 'requested';
    const page = Number(searchParams.get('page')) || 1;
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    /** @type {[{ type: 'pay' | 'reject', affiliate: object } | null, Function]} */
    const [dialog, setDialog] = useState(null);

    const load = useCallback(() => {
        setError(null);
        affiliatesApi
            .listStorePayouts({ status: status || undefined, page })
            .then(setResult)
            .catch((loadError) => setError(loadError.message));
    }, [status, page]);

    useEffect(load, [load]);

    const onChanged = useCallback(() => {
        setDialog(null);
        load();
    }, [load]);

    const actions = useAffiliateActions({ onChanged, onRemoved: onChanged });
    const summary = result?.summary;

    const tabs = useMemo(
        () => [
            ...STATUS_KEYS.map((key) => ({ value: key, label: key === 'requested' ? t('بانتظار التحويل') : PAYOUT_STATUSES[key].label, count: summary?.[key] })),
            { value: '', label: t('الكل') },
        ],
        [summary],
    );

    const setQuery = (patch) => {
        const next = { status, page, ...patch };

        setSearchParams({ status: next.status, ...(next.page > 1 && { page: next.page }) }, { replace: true });
    };

    return (
        <>
            <PageHeader title={t('طلبات التحويل')} description={t('طلبات المسوقين لتحويل عمولاتهم، وسجل التحويلات التي تمت')} breadcrumbs={[t('لوحة التحكم'), t('التسويق'), t('طلبات التحويل')]} />

            <section className="mk-card overflow-hidden">
                <Tabs tabs={tabs} value={status} onChange={(value) => setQuery({ status: value, page: 1 })} className="px-3" />

                {error ? (
                    <div className="p-6">
                        <EmptyState icon="alert-triangle" title={t('تعذر تحميل التحويلات')} description={error} action={<Button variant="secondary" icon="refresh" onClick={load}>{t('إعادة المحاولة')}</Button>} />
                    </div>
                ) : !result ? (
                    <div className="flex flex-col gap-3 p-4">
                        {[0, 1, 2].map((index) => (
                            <Skeleton key={index} className="h-20 w-full" />
                        ))}
                    </div>
                ) : result.data.length === 0 ? (
                    <div className="p-6">
                        <EmptyState icon="send" title={status === 'requested' ? t('لا توجد طلبات تحويل حالياً') : t('لا توجد تحويلات')} description={t('عندما يطلب مسوق تحويل عمولته سيظهر طلبه هنا ويصلك إشعار به.')} />
                    </div>
                ) : (
                    <ul className="divide-y divide-line">
                        {result.data.map((payout) => (
                            <li key={payout.payout_id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                                <Link to={`/dashboard/affiliates?affiliate=${payout.affiliate.affiliate_id}`} className="flex min-w-0 items-center gap-3 sm:w-64">
                                    <Avatar name={payout.affiliate.full_name} src={payout.affiliate.avatar_url} />
                                    <span className="min-w-0">
                                        <span className="block truncate font-semibold text-ink hover:text-primary">{payout.affiliate.full_name}</span>
                                        <span className="ltr block truncate text-start text-xs text-muted">{payout.affiliate.phone}</span>
                                    </span>
                                </Link>

                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-base font-bold text-ink">{formatMoney(payout.amount)}</span>
                                        <PayoutStatusBadge status={payout.status} />
                                    </div>
                                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                                        <span>
                                            {PAYOUT_METHODS[payout.payout_method.type]?.label} <span className="ltr inline-block font-mono">•••• {payout.payout_method.account_number_last4}</span>
                                        </span>
                                        {payout.status === 'requested' && <span>{t('طُلب {value}', { value: formatRelative(payout.created_at) })}</span>}
                                        {payout.status === 'paid' && <span>{t('حُوِّل في {value}', { value: formatDate(payout.paid_at) })}</span>}
                                        {payout.status === 'rejected' && <span>{t('رُفض في {value}', { value: formatDate(payout.rejected_at) })}</span>}
                                        {payout.reference && (
                                            <span>
                                                {t('رقم العملية:')} <span className="ltr inline-block font-mono text-ink-2">{payout.reference}</span>
                                            </span>
                                        )}
                                        {payout.status === 'requested' && <span>{t('الرصيد المعلق: {value}', { value: formatMoney(payout.affiliate.stats.pending_balance) })}</span>}
                                    </div>
                                    {payout.request_note && <p className="mt-1.5 text-xs text-ink-2">{t('ملاحظة المسوق: {request_note}', { request_note: payout.request_note })}</p>}
                                    {payout.note && <p className="mt-1 text-xs text-ink-2">{t('ملاحظة المتجر: {note}', { note: payout.note })}</p>}
                                </div>

                                {payout.status === 'requested' && can('payouts.update') && (
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="success" icon="check" onClick={() => setDialog({ type: 'pay', affiliate: payout.affiliate })}>
                                            {t('تأكيد التحويل')}
                                        </Button>
                                        <Button size="sm" variant="danger-soft" icon="x" onClick={() => setDialog({ type: 'reject', affiliate: payout.affiliate })}>
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
                        <Pagination meta={result.meta} onPageChange={(nextPage) => setQuery({ page: nextPage })} />
                    </div>
                )}
            </section>

            <RecordPayoutModal
                affiliate={dialog?.affiliate ?? null}
                open={dialog?.type === 'pay'}
                onClose={() => setDialog(null)}
                saving={actions.pending === 'payout'}
                onSave={(payload) => actions.recordPayout(dialog.affiliate, payload).catch(() => {})}
            />
            <RejectPayoutDialog
                affiliate={dialog?.affiliate ?? null}
                open={dialog?.type === 'reject'}
                onClose={() => setDialog(null)}
                loading={actions.pending === 'reject-payout'}
                onConfirm={(note) => actions.rejectPayout(dialog.affiliate, note).catch(() => {})}
            />
        </>
    );
}
