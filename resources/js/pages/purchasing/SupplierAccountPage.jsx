import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Badge, EmptyState, StatCard, StatStrip } from '@/components/ui/Display';
import { Skeleton } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { PurchaseReturnModal, SupplierPaymentModal } from '@/features/purchasing/SupplierAccountModals';
import { t } from '@/i18n';
import { cn, formatDate, formatMoney } from '@/lib/format';
import { suppliersApi } from '@/services/purchasingApi';

const ENTRY_TYPES = {
    receipt: { label: t('استلام بضاعة'), tone: 'info' },
    payment: { label: t('دفعة'), tone: 'success' },
    return: { label: t('مرتجع'), tone: 'warning' },
};

/** A supplier's account: what was received from them, returned and paid, the balance, and the statement. */
export function SupplierAccountPage() {
    const { supplierId } = useParams();
    const { can } = useAuth();
    const toast = useToast();
    const [account, setAccount] = useState(null);
    const [error, setError] = useState(null);
    const [paying, setPaying] = useState(false);
    const [returning, setReturning] = useState(false);
    const [deleting, setDeleting] = useState(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(() => {
        setError(null);
        suppliersApi
            .account(supplierId)
            .then(setAccount)
            .catch((loadError) => setError(loadError.message));
    }, [supplierId]);

    useEffect(load, [load]);

    const removePayment = async () => {
        setBusy(true);

        try {
            setAccount(await suppliersApi.removePayment(supplierId, deleting.id));
            toast.success(t('تم حذف الدفعة'));
            setDeleting(null);
        } catch (removeError) {
            toast.error(t('تعذر حذف الدفعة'), removeError.message);
        } finally {
            setBusy(false);
        }
    };

    if (error) {
        return <EmptyState icon="alert-triangle" title={t('تعذر تحميل حساب المورد')} description={error} action={<Button variant="secondary" to="/dashboard/suppliers">{t('العودة للموردين')}</Button>} />;
    }

    if (!account) {
        return (
            <div className="flex flex-col gap-4">
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-28 w-full rounded-xl" />
                <Skeleton className="h-80 w-full rounded-xl" />
            </div>
        );
    }

    const { supplier, account: totals, entries } = account;
    const owed = totals.balance > 0;

    return (
        <>
            <PageHeader
                title={supplier.name}
                description={t('كشف حساب المورد: البضاعة المستلمة والمدفوعات والمرتجعات')}
                breadcrumbs={[t('لوحة التحكم'), t('الموردين'), supplier.name]}
                actions={
                    <>
                        {can('purchasing.create') && (
                            <Button variant="secondary" icon="upload" onClick={() => setReturning(true)}>
                                {t('مرتجع للمورد')}
                            </Button>
                        )}
                        {can('suppliers.update') && (
                            <Button icon="wallet" onClick={() => setPaying(true)}>
                                {t('تسجيل دفعة')}
                            </Button>
                        )}
                    </>
                }
            />

            <StatStrip>
                <StatCard label={owed ? t('المستحق للمورد') : totals.balance < 0 ? t('رصيد لك عند المورد') : t('الحساب')} value={totals.balance === 0 ? t('خالص') : formatMoney(Math.abs(totals.balance))} icon="wallet" tone={owed ? 'danger' : 'success'} />
                <StatCard label={t('بضاعة مستلمة')} value={formatMoney(totals.received)} icon="download" tone="info" />
                <StatCard label={t('مدفوع')} value={formatMoney(totals.paid)} icon="check-circle" tone="success" />
                <StatCard label={t('مرتجعات')} value={formatMoney(totals.returned)} icon="upload" tone="warning" />
            </StatStrip>

            <section className="mk-card overflow-hidden">
                <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4">
                    <div>
                        <h2 className="font-semibold text-ink">{t('كشف الحساب')}</h2>
                        <p className="text-xs text-muted">{t('الأحدث أولاً، والرصيد بعد كل حركة')}</p>
                    </div>
                    <Link to={`/dashboard/purchase-orders?supplier_id=${supplier.supplier_id}`} className="text-sm font-medium text-primary hover:underline">
                        {t('أوامر الشراء من المورد')}
                    </Link>
                </header>

                {entries.length === 0 ? (
                    <div className="p-6">
                        <EmptyState icon="file-text" title={t('لا توجد حركات بعد')} description={t('عند استلام بضاعة من أمر شراء تُضاف قيمتها هنا تلقائياً، وتسجّل المدفوعات والمرتجعات من الأزرار أعلاه.')} />
                    </div>
                ) : (
                    <div className="mk-scroll overflow-x-auto">
                        <table className="w-full min-w-[760px] text-sm">
                            <thead className="mk-thead">
                                <tr>
                                    {[t('التاريخ'), t('الحركة'), t('البيان'), t('عليك'), t('لك'), t('الرصيد'), ''].map((column, index) => (
                                        <th key={index} scope="col" className="px-4 py-3 text-start font-medium whitespace-nowrap">
                                            {column}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                                {entries.map((entry) => (
                                    <tr key={`${entry.type}-${entry.id}-${entry.date}`}>
                                        <td className="px-4 py-3 whitespace-nowrap text-ink-2">{formatDate(entry.date)}</td>
                                        <td className="px-4 py-3">
                                            <Badge tone={ENTRY_TYPES[entry.type].tone} dot>
                                                {ENTRY_TYPES[entry.type].label}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3">
                                            {entry.type === 'receipt' ? (
                                                <Link to={`/dashboard/purchase-orders/${entry.id}`} className="font-medium text-primary hover:underline">
                                                    {t('أمر شراء {reference}', { reference: entry.reference })}
                                                </Link>
                                            ) : (
                                                entry.reference && <span className="font-medium text-ink">{entry.type === 'return' ? t('مرتجع {reference}', { reference: entry.reference }) : entry.reference}</span>
                                            )}
                                            {entry.description && <span className="block text-xs text-muted">{entry.description}</span>}
                                        </td>
                                        <td className="mk-num px-4 py-3 whitespace-nowrap text-ink">{entry.debit > 0 ? formatMoney(entry.debit) : '—'}</td>
                                        <td className="mk-num px-4 py-3 whitespace-nowrap text-success">{entry.credit > 0 ? formatMoney(entry.credit) : '—'}</td>
                                        <td className={cn('mk-num px-4 py-3 font-semibold whitespace-nowrap', entry.balance > 0 ? 'text-ink' : 'text-success')}>{formatMoney(entry.balance)}</td>
                                        <td className="px-2 py-3">
                                            {entry.type === 'payment' && can('suppliers.update') && <Button size="icon" variant="ghost" icon="trash" onClick={() => setDeleting(entry)} aria-label={t('حذف الدفعة')} />}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <SupplierPaymentModal
                open={paying}
                supplier={supplier}
                balance={totals.balance}
                onClose={() => setPaying(false)}
                onSaved={(updated) => {
                    setAccount(updated);
                    setPaying(false);
                }}
            />
            <PurchaseReturnModal
                open={returning}
                supplier={supplier}
                onClose={() => setReturning(false)}
                onSaved={() => {
                    setReturning(false);
                    load();
                }}
            />
            <ConfirmDialog
                open={Boolean(deleting)}
                onClose={() => setDeleting(null)}
                onConfirm={removePayment}
                loading={busy}
                icon="trash"
                title={t('حذف الدفعة؟')}
                description={deleting ? t('ستُحذف دفعة بقيمة {amount} ويزيد المستحق للمورد بنفس القيمة.', { amount: formatMoney(deleting.credit) }) : ''}
                confirmLabel={t('حذف')}
            />
        </>
    );
}
