import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Avatar, EmptyState, StatCard, StatStrip } from '@/components/ui/Display';
import { Input } from '@/components/ui/Form';
import { Skeleton } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { SupplierFormModal } from '@/features/purchasing/SupplierFormModal';
import { useDebouncedValue } from '@/hooks/common';
import { t } from '@/i18n';
import { cn, formatMoney, formatNumber } from '@/lib/format';
import { suppliersApi } from '@/services/purchasingApi';

/** The store's suppliers with their purchase orders and what the store owes each; add, edit or delete (when unused). */
export function SuppliersPage() {
    const { can } = useAuth();
    const toast = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const search = useDebouncedValue(searchTerm, 300);
    const [suppliers, setSuppliers] = useState(null);
    const [totalDue, setTotalDue] = useState(null);
    const [error, setError] = useState(null);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(() => {
        setError(null);
        suppliersApi
            .listWithBalances({ search })
            .then((response) => {
                setSuppliers(response.data);
                setTotalDue(response.total_due);
            })
            .catch((loadError) => setError(loadError.message));
    }, [search]);

    useEffect(load, [load]);

    const remove = async () => {
        setBusy(true);

        try {
            await suppliersApi.remove(deleting.supplier_id);
            toast.success(t('تم حذف المورد'));
            setDeleting(null);
            load();
        } catch (removeError) {
            toast.error(t('تعذر حذف المورد'), removeError.errors?.supplier ?? removeError.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <PageHeader
                title={t('الموردين')}
                description={t('الجهات التي تشتري منها بضاعتك')}
                breadcrumbs={[t('لوحة التحكم'), t('المخزون والمشتريات'), t('الموردين')]}
                actions={
                    can('suppliers.create') && (
                        <Button icon="plus" onClick={() => setEditing({})}>
                            {t('مورد جديد')}
                        </Button>
                    )
                }
            />

            <StatStrip>
                <StatCard label={t('إجمالي المستحق للموردين')} value={totalDue === null ? '—' : formatMoney(totalDue)} icon="wallet" tone={totalDue > 0 ? 'danger' : 'success'} hint={t('قيمة البضاعة المستلمة ناقص المدفوع والمرتجع')} />
                <StatCard label={t('موردين لهم مستحقات')} value={suppliers ? formatNumber(suppliers.filter((supplier) => supplier.account?.balance > 0).length) : '—'} icon="users" tone="warning" />
                <StatCard label={t('أوامر شراء مفتوحة')} value={suppliers ? formatNumber(suppliers.reduce((sum, supplier) => sum + supplier.open_purchase_orders_count, 0)) : '—'} icon="truck" tone="info" />
            </StatStrip>

            <section className="mk-card overflow-hidden">
                <div className="mk-toolbar">
                    <Input type="search" icon="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder={t('ابحث بالاسم أو الهاتف...')} aria-label={t('بحث في الموردين')} className="lg:w-80" />
                </div>

                {error ? (
                    <div className="p-6">
                        <EmptyState icon="alert-triangle" title={t('تعذر تحميل الموردين')} description={error} action={<Button variant="secondary" icon="refresh" onClick={load}>{t('إعادة المحاولة')}</Button>} />
                    </div>
                ) : !suppliers ? (
                    <div className="flex flex-col gap-3 p-4">
                        {[0, 1, 2].map((index) => (
                            <Skeleton key={index} className="h-16 w-full" />
                        ))}
                    </div>
                ) : suppliers.length === 0 ? (
                    <div className="p-6">
                        <EmptyState
                            icon="building"
                            title={search ? t('لا يوجد موردين مطابقين') : t('لا يوجد موردين بعد')}
                            description={t('أضف موردينك لتسجّل أوامر الشراء منهم وتتابع استلام البضاعة.')}
                            action={!search && can('suppliers.create') && <Button icon="plus" onClick={() => setEditing({})}>{t('مورد جديد')}</Button>}
                        />
                    </div>
                ) : (
                    <ul className="divide-y divide-line border-t border-line">
                        {suppliers.map((supplier) => (
                            <li key={supplier.supplier_id} className="flex flex-wrap items-center gap-4 px-4 py-3.5">
                                <Avatar name={supplier.name} size="md" />
                                <div className="min-w-0 flex-1">
                                    <Link to={`/dashboard/suppliers/${supplier.supplier_id}`} className="font-semibold text-ink hover:text-primary">
                                        {supplier.name}
                                    </Link>
                                    <p className="flex flex-wrap gap-x-3 text-xs text-muted">
                                        {supplier.contact_name && <span>{supplier.contact_name}</span>}
                                        {supplier.phone && <span className="ltr">{supplier.phone}</span>}
                                        {supplier.email && <span className="ltr">{supplier.email}</span>}
                                    </p>
                                </div>
                                <Link to={`/dashboard/purchase-orders?supplier_id=${supplier.supplier_id}`} className="text-sm text-ink-2 hover:text-primary">
                                    {t('{count} أمر شراء', { count: formatNumber(supplier.purchase_orders_count) })}
                                    {supplier.open_purchase_orders_count > 0 && <span className="ms-1 text-xs text-info">{t('({count} مفتوح)', { count: formatNumber(supplier.open_purchase_orders_count) })}</span>}
                                </Link>
                                <Link to={`/dashboard/suppliers/${supplier.supplier_id}`} className="min-w-28 text-end" title={t('كشف الحساب')}>
                                    <span className="block text-2xs text-muted">{supplier.account?.balance < 0 ? t('رصيد لك') : t('المستحق')}</span>
                                    <span className={cn('mk-num font-semibold', supplier.account?.balance > 0 ? 'text-danger' : 'text-success')}>{supplier.account?.balance ? formatMoney(Math.abs(supplier.account.balance)) : t('خالص')}</span>
                                </Link>
                                <div className={cn('flex gap-1', !can('suppliers.update') && 'hidden')}>
                                    <Button size="sm" variant="soft" icon="plus" to={`/dashboard/purchase-orders/new?supplier_id=${supplier.supplier_id}`}>
                                        {t('أمر شراء')}
                                    </Button>
                                    <Button size="icon" variant="ghost" icon="edit" onClick={() => setEditing(supplier)} aria-label={t('تعديل {name}', { name: supplier.name })} />
                                    <Button size="icon" variant="ghost" icon="trash" onClick={() => setDeleting(supplier)} disabled={supplier.purchase_orders_count > 0} aria-label={t('حذف {name}', { name: supplier.name })} title={supplier.purchase_orders_count > 0 ? t('لا يمكن حذف مورد له أوامر شراء') : undefined} />
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <SupplierFormModal
                open={Boolean(editing)}
                supplier={editing?.supplier_id ? editing : null}
                onClose={() => setEditing(null)}
                onSaved={() => {
                    setEditing(null);
                    load();
                }}
            />
            <ConfirmDialog
                open={Boolean(deleting)}
                onClose={() => setDeleting(null)}
                onConfirm={remove}
                loading={busy}
                icon="trash"
                title={t('حذف المورد؟')}
                description={deleting ? t('سيتم حذف {name} نهائياً.', { name: deleting.name }) : ''}
                confirmLabel={t('حذف')}
            />
        </>
    );
}
