import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Badge, Card, EmptyState } from '@/components/ui/Display';
import { Icon } from '@/components/ui/Icon';
import { Pagination } from '@/components/ui/Navigation';
import { Skeleton } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useWarehouses } from '@/features/inventory/useWarehouses';
import { TransferModal, WarehouseFormModal } from '@/features/inventory/WarehouseModals';
import { t } from '@/i18n';
import { formatDate, formatMoney, formatNumber } from '@/lib/format';
import { findGovernorate } from '@/lib/locations';
import { transfersApi, warehousesApi } from '@/services/warehousesApi';

/** Transfers between warehouses, newest first. */
function TransfersLog({ refreshKey }) {
    const [page, setPage] = useState(1);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        setError(null);
        transfersApi
            .list(page)
            .then(setResult)
            .catch((loadError) => setError(loadError.message));
    }, [page, refreshKey]);

    if (error) {
        return <p className="rounded-xl border border-dashed border-line-strong p-5 text-center text-sm text-danger">{error}</p>;
    }

    if (!result) {
        return <Skeleton className="h-24 w-full rounded-xl" />;
    }

    if (result.data.length === 0) {
        return <p className="rounded-xl border border-dashed border-line-strong p-5 text-center text-sm text-muted">{t('لا توجد تحويلات بين المخازن بعد.')}</p>;
    }

    return (
        <div className="flex flex-col gap-3">
            <ul className="flex flex-col gap-3">
                {result.data.map((transfer) => (
                    <TransferRow key={transfer.transfer_id} transfer={transfer} />
                ))}
            </ul>
            {result.meta.last_page > 1 && <Pagination meta={result.meta} onPageChange={setPage} />}
        </div>
    );
}

/** A transfer's items grouped by product: each product once, with its variants and their quantities. */
function groupItems(items) {
    const groups = new Map();

    items.forEach((item) => {
        const group = groups.get(item.product_name) ?? { name: item.product_name, variants: [], quantity: 0 };

        group.variants.push(item);
        group.quantity += item.quantity;
        groups.set(item.product_name, group);
    });

    return [...groups.values()];
}

/**
 * One transfer: its number and route (from → to) with the item count, units and date, then the items grouped
 * by product with each variant's quantity, and the note.
 */
function TransferRow({ transfer }) {
    const products = groupItems(transfer.items);

    return (
        <li className="overflow-hidden rounded-xl border border-line">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3 bg-surface-2 px-4 py-3">
                <span className="mk-num rounded-md bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">#{transfer.number}</span>
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-sm">
                    <span className="inline-flex min-w-0 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1">
                        <span className="text-2xs text-muted">{t('من')}</span>
                        <span className="truncate font-medium text-ink">{transfer.from_warehouse.name}</span>
                    </span>
                    <Icon name="arrow-left" className="size-4 shrink-0 text-brand-accent" />
                    <span className="inline-flex min-w-0 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1">
                        <span className="text-2xs text-muted">{t('إلى')}</span>
                        <span className="truncate font-medium text-ink">{transfer.to_warehouse.name}</span>
                    </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted">
                    <span className="mk-num inline-flex items-center gap-1">
                        <Icon name="box" className="size-3.5" />
                        {t('{products} منتج · {units} قطعة', { products: formatNumber(products.length), units: formatNumber(transfer.units) })}
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <Icon name="clock" className="size-3.5" />
                        {formatDate(transfer.created_at)}
                    </span>
                </div>
            </div>

            <ul className="divide-y divide-line">
                {products.map((product) => (
                    <li key={product.name} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                        <span className="min-w-40 flex-1 text-sm font-medium text-ink">{product.name}</span>
                        <span className="flex flex-wrap gap-1.5">
                            {product.variants.map((item) => (
                                <span key={item.variant_id ?? item.variant_title} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface py-0.5 ps-2.5 pe-1 text-xs text-ink-2">
                                    {item.variant_title || t('بدون خيارات')}
                                    <span className="mk-num rounded-full bg-surface-3 px-2 py-0.5 font-semibold text-ink">×{formatNumber(item.quantity)}</span>
                                </span>
                            ))}
                        </span>
                        {product.variants.length > 1 && <span className="mk-num text-xs font-semibold text-ink-2">{t('{count} قطعة', { count: formatNumber(product.quantity) })}</span>}
                    </li>
                ))}
            </ul>

            {transfer.note && (
                <p className="flex items-start gap-2 border-t border-line bg-warning-soft/40 px-4 py-2.5 text-xs text-ink-2">
                    <Icon name="message-square" className="mt-0.5 size-3.5 shrink-0 text-muted" />
                    <span>
                        <span className="font-medium text-ink">{t('ملاحظة:')}</span> {transfer.note}
                    </span>
                </p>
            )}
        </li>
    );
}

/**
 * The store's warehouses in fulfilment order: orders take stock from the first one that has
 * it, and the first is the default for restocks and new products.
 */
export function WarehousesPage() {
    const { can } = useAuth();
    const toast = useToast();
    const { warehouses, error, reload } = useWarehouses();
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [transferOpen, setTransferOpen] = useState(false);
    const [transfersKey, setTransfersKey] = useState(0);
    const [busy, setBusy] = useState(false);

    const move = useCallback(
        async (index, offset) => {
            const ids = warehouses.map((warehouse) => warehouse.warehouse_id);

            [ids[index], ids[index + offset]] = [ids[index + offset], ids[index]];

            try {
                await warehousesApi.reorder(ids);
                await reload();
            } catch (moveError) {
                toast.error(t('تعذر تغيير الترتيب'), moveError.message);
            }
        },
        [warehouses, reload, toast],
    );

    const remove = async () => {
        setBusy(true);

        try {
            await warehousesApi.remove(deleting.warehouse_id);
            toast.success(t('تم حذف المخزن'));
            setDeleting(null);
            reload();
        } catch (removeError) {
            toast.error(t('تعذر حذف المخزن'), removeError.errors?.warehouse ?? removeError.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <PageHeader
                title={t('المخازن')}
                description={t('أماكن تخزين بضاعتك. الطلب يُخصم أولاً من مخزن في نفس محافظة العميل، ثم بالترتيب.')}
                breadcrumbs={[t('لوحة التحكم'), t('المخزون والمشتريات'), t('المخازن')]}
                actions={
                    <>
                        {can('inventory.transfer') && (
                            <Button variant="secondary" icon="refresh" onClick={() => setTransferOpen(true)} disabled={!warehouses || warehouses.length < 2}>
                                {t('تحويل بين المخازن')}
                            </Button>
                        )}
                        {can('warehouses.create') && (
                            <Button icon="plus" onClick={() => setEditing({})}>
                                {t('مخزن جديد')}
                            </Button>
                        )}
                    </>
                }
            />

            {error ? (
                <EmptyState icon="alert-triangle" title={t('تعذر تحميل المخازن')} description={error} action={<Button variant="secondary" icon="refresh" onClick={reload}>{t('إعادة المحاولة')}</Button>} />
            ) : !warehouses ? (
                <Skeleton className="h-48 w-full rounded-xl" />
            ) : (
                <div className="flex flex-col gap-6">
                    <Card title={t('ترتيب الخصم')} description={t('للطلبات من محافظات ليس بها مخزن، أو عندما لا يكفي مخزن المحافظة. الأول هو المخزن الافتراضي.')} bodyClassName="p-0">
                        <ul className="divide-y divide-line">
                            {warehouses.map((warehouse, index) => (
                                <li key={warehouse.warehouse_id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-3 text-sm font-semibold text-ink-2">{formatNumber(index + 1)}</span>
                                    <div className="min-w-0 flex-1">
                                        <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                                            {warehouse.name}
                                            {index === 0 && <Badge tone="primary">{t('الافتراضي')}</Badge>}
                                        </p>
                                        <p className="text-xs text-muted">{[findGovernorate(warehouse.governorate_id)?.name, warehouse.address].filter(Boolean).join(' · ') || '—'}</p>
                                    </div>
                                    <div className="text-end text-sm">
                                        <p className="font-semibold text-ink">{t('{count} قطعة', { count: formatNumber(warehouse.units ?? 0) })}</p>
                                        <p className="text-xs text-muted">{t('بالتكلفة {value}', { value: formatMoney(warehouse.cost_value ?? 0) })}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {can('warehouses.update') && (
                                            <>
                                                <Button size="icon" variant="ghost" icon="chevron-down" className="rotate-180" onClick={() => move(index, -1)} disabled={index === 0} aria-label={t('رفع {name} في الترتيب', { name: warehouse.name })} />
                                                <Button size="icon" variant="ghost" icon="chevron-down" onClick={() => move(index, 1)} disabled={index === warehouses.length - 1} aria-label={t('خفض {name} في الترتيب', { name: warehouse.name })} />
                                                <Button size="icon" variant="ghost" icon="edit" onClick={() => setEditing(warehouse)} aria-label={t('تعديل {name}', { name: warehouse.name })} />
                                            </>
                                        )}
                                        {can('warehouses.delete') && (
                                            <Button size="icon" variant="ghost" icon="trash" onClick={() => setDeleting(warehouse)} disabled={warehouses.length === 1 || warehouse.units > 0} title={warehouse.units > 0 ? t('انقل كل الكميات من هذا المخزن قبل حذفه') : undefined} aria-label={t('حذف {name}', { name: warehouse.name })} />
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </Card>

                    <Card title={t('التحويلات بين المخازن')}>
                        <TransfersLog refreshKey={transfersKey} />
                    </Card>
                </div>
            )}

            <WarehouseFormModal
                open={Boolean(editing)}
                warehouse={editing?.warehouse_id ? editing : null}
                onClose={() => setEditing(null)}
                onSaved={() => {
                    setEditing(null);
                    reload();
                }}
            />
            {warehouses && (
                <TransferModal
                    open={transferOpen}
                    warehouses={warehouses}
                    onClose={() => setTransferOpen(false)}
                    onTransferred={() => {
                        setTransferOpen(false);
                        setTransfersKey((value) => value + 1);
                        reload();
                    }}
                />
            )}
            <ConfirmDialog
                open={Boolean(deleting)}
                onClose={() => setDeleting(null)}
                onConfirm={remove}
                loading={busy}
                icon="trash"
                title={t('حذف المخزن؟')}
                description={deleting ? t('سيتم حذف {name}. يبقى في سجل الحركات باسمه.', { name: deleting.name }) : ''}
                confirmLabel={t('حذف')}
            />
        </>
    );
}
