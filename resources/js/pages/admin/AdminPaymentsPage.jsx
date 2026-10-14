import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Display';
import { Pagination } from '@/components/ui/Navigation';
import { Skeleton } from '@/components/ui/Spinner';
import { BILLING_METHODS } from '@/features/billing/billing';
import { t } from '@/i18n';
import { formatDate, formatMoney } from '@/lib/format';
import { adminApi } from '@/services/adminApi';

/** Every recorded subscription payment, newest first. */
export function AdminPaymentsPage() {
    const [page, setPage] = useState(1);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const load = useCallback(() => {
        setError(null);
        adminApi
            .payments(page)
            .then(setResult)
            .catch((loadError) => setError(loadError.message));
    }, [page]);

    useEffect(load, [load]);

    return (
        <>
            <PageHeader title={t('مدفوعات الاشتراكات')} description={t('كل المدفوعات المسجّلة وفترات التفعيل')} />

            <section className="mk-card overflow-hidden">
                {error ? (
                    <div className="p-6">
                        <EmptyState icon="alert-triangle" title={t('تعذر تحميل المدفوعات')} description={error} action={<Button variant="secondary" icon="refresh" onClick={load}>{t('إعادة المحاولة')}</Button>} />
                    </div>
                ) : !result ? (
                    <div className="flex flex-col gap-3 p-4">
                        {[0, 1, 2].map((index) => (
                            <Skeleton key={index} className="h-12 w-full" />
                        ))}
                    </div>
                ) : result.data.length === 0 ? (
                    <div className="p-6">
                        <EmptyState icon="wallet" title={t('لا توجد مدفوعات بعد')} />
                    </div>
                ) : (
                    <div className="mk-scroll overflow-x-auto">
                        <table className="w-full min-w-[820px] text-sm">
                            <thead className="border-b border-line bg-surface-2 text-xs text-muted">
                                <tr>
                                    {[t('التاريخ'), t('المتجر'), t('الباقة'), t('الفترة'), t('طريقة الدفع'), t('سجّلها'), t('المبلغ')].map((column) => (
                                        <th key={column} scope="col" className="px-4 py-3 text-start font-medium whitespace-nowrap">
                                            {column}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                                {result.data.map((payment) => (
                                    <tr key={payment.payment_id}>
                                        <td className="px-4 py-3 whitespace-nowrap text-muted">{formatDate(payment.created_at)}</td>
                                        <td className="px-4 py-3 font-medium text-ink">{payment.store?.name}</td>
                                        <td className="px-4 py-3 text-ink-2">{payment.plan_name}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-ink-2">{t('{from} ← {to}', { from: formatDate(payment.starts_at), to: formatDate(payment.ends_at) })}</td>
                                        <td className="px-4 py-3 text-ink-2">
                                            {BILLING_METHODS[payment.method]}
                                            {payment.reference && <span className="ltr block text-start font-mono text-xs text-muted">{payment.reference}</span>}
                                        </td>
                                        <td className="px-4 py-3 text-ink-2">{payment.recorded_by ?? '—'}</td>
                                        <td className="px-4 py-3 font-semibold text-ink">{formatMoney(payment.amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {result && result.meta.total > result.meta.per_page && (
                    <div className="border-t border-line px-4 py-3">
                        <Pagination meta={result.meta} onPageChange={setPage} />
                    </div>
                )}
            </section>
        </>
    );
}
