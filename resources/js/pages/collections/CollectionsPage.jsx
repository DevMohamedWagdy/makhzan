import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Badge, EmptyState } from '@/components/ui/Display';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { CollectionFormModal } from '@/features/products/CollectionFormModal';
import { CollectionProductsDrawer } from '@/features/products/CollectionProductsDrawer';
import { localized, t } from '@/i18n';
import { cn, formatNumber } from '@/lib/format';
import { collectionsApi } from '@/services/productsApi';

/** Hand-picked product groups shown as sections on the store home page: add, edit, reorder, fill and delete. */
export function CollectionsPage() {
    const { can } = useAuth();
    const toast = useToast();
    const [collections, setCollections] = useState(null);
    const [error, setError] = useState(null);
    /** @type {[{ type: 'form' | 'products' | 'delete', collection?: object } | null, Function]} */
    const [dialog, setDialog] = useState(null);
    const [busy, setBusy] = useState(false);

    const reload = useCallback(
        () =>
            collectionsApi
                .list()
                .then((response) => {
                    setCollections(response);
                    setError(null);
                })
                .catch((loadError) => setError(loadError.message)),
        [],
    );

    useEffect(() => {
        reload();
    }, [reload]);

    const move = async (index, direction) => {
        const ordered = [...collections];
        const [moved] = ordered.splice(index, 1);

        ordered.splice(index + direction, 0, moved);
        setBusy(true);

        try {
            await Promise.all(ordered.map((collection, position) => collection.position !== position && collectionsApi.update(collection.collection_id, { name: collection.name, position })).filter(Boolean));
        } catch (moveError) {
            toast.error(t('تعذر تغيير الترتيب'), moveError.message);
        } finally {
            // Reload either way: when one update fails, the list shows the order that was actually saved.
            await reload();
            setBusy(false);
        }
    };

    const remove = async () => {
        setBusy(true);

        try {
            await collectionsApi.remove(dialog.collection.collection_id);
            toast.success(t('تم حذف التصنيف'));
            setDialog(null);
            reload();
        } catch (removeError) {
            toast.error(t('تعذر حذف التصنيف'), removeError.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <PageHeader
                title={t('التصنيفات')}
                description={t('اجمع منتجات مختارة في تصنيفات مثل «أحدث العروض» لتظهر كأقسام في الصفحة الرئيسية لمتجرك.')}
                breadcrumbs={[t('لوحة التحكم'), t('الكتالوج'), t('التصنيفات')]}
                actions={
                    can('collections.create') && (
                        <Button icon="plus" onClick={() => setDialog({ type: 'form' })}>
                            {t('إضافة تصنيف')}
                        </Button>
                    )
                }
            />

            <section className="mk-card overflow-hidden">
                {error ? (
                    <div className="p-6">
                        <EmptyState icon="alert-triangle" title={t('تعذر تحميل التصنيفات')} description={error} action={<Button variant="secondary" icon="refresh" onClick={reload}>{t('إعادة المحاولة')}</Button>} />
                    </div>
                ) : !collections ? (
                    <div className="flex flex-col gap-3 p-4">
                        {[0, 1, 2].map((index) => (
                            <Skeleton key={index} className="h-16 w-full" />
                        ))}
                    </div>
                ) : collections.length === 0 ? (
                    <div className="p-6">
                        <EmptyState
                            icon="nav-collections"
                            title={t('لا توجد تصنيفات بعد')}
                            description={t('أنشئ تصنيفاً مثل «أحدث العروض» أو «أحدث المنتجات»، ثم اختر منتجاته ليظهر قسماً في الصفحة الرئيسية لمتجرك.')}
                            action={
                                can('collections.create') && <Button icon="plus" onClick={() => setDialog({ type: 'form' })}>
                                    {t('إضافة أول تصنيف')}
                                </Button>
                            }
                        />
                    </div>
                ) : (
                    <ul className="divide-y divide-line">
                        {collections.map((collection, index) => (
                            <li key={collection.collection_id} className="flex flex-wrap items-center gap-4 p-4">
                                <div className={cn('flex flex-col', !can('collections.update') && 'hidden')}>
                                    <button type="button" onClick={() => move(index, -1)} disabled={busy || index === 0} className="grid size-6 place-items-center rounded text-muted hover:bg-surface-3 hover:text-ink disabled:opacity-30" aria-label={t('نقل {name} لأعلى', { name: localized(collection) })}>
                                        <Icon name="chevron-down" className="size-4 rotate-180" />
                                    </button>
                                    <button type="button" onClick={() => move(index, 1)} disabled={busy || index === collections.length - 1} className="grid size-6 place-items-center rounded text-muted hover:bg-surface-3 hover:text-ink disabled:opacity-30" aria-label={t('نقل {name} لأسفل', { name: localized(collection) })}>
                                        <Icon name="chevron-down" className="size-4" />
                                    </button>
                                </div>
                                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                                    <Icon name="nav-collections" className="size-5" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-semibold text-ink">{localized(collection)}</span>
                                        {!collection.is_active && <Badge tone="neutral" icon="eye-off">{t('مخفي من المتجر')}</Badge>}
                                    </div>
                                    <p className="mt-0.5 text-xs text-muted">{t('{value} منتج', { value: formatNumber(collection.products_count) })}</p>
                                </div>
                                <Button variant="secondary" size="sm" icon="box" onClick={() => setDialog({ type: 'products', collection })}>
                                    {can('collections.update') ? t('إدارة المنتجات') : t('عرض المنتجات')}
                                </Button>
                                <div className="flex gap-1">
                                    {can('collections.update') && (
                                        <Button variant="secondary" size="sm" icon="edit" onClick={() => setDialog({ type: 'form', collection })}>
                                            {t('تعديل')}
                                        </Button>
                                    )}
                                    {can('collections.delete') && (
                                        <Button variant="danger-soft" size="icon" onClick={() => setDialog({ type: 'delete', collection })} aria-label={t('حذف {name}', { name: localized(collection) })} title={t('حذف')}>
                                            <Icon name="trash" className="size-4" />
                                        </Button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <CollectionFormModal
                collection={dialog?.type === 'form' ? (dialog.collection ?? null) : null}
                open={dialog?.type === 'form'}
                onClose={() => setDialog(null)}
                onSaved={(saved) => {
                    toast.success(dialog.collection ? t('تم حفظ التصنيف') : t('تمت إضافة التصنيف'), localized(saved));
                    // A new collection goes straight to picking its products.
                    setDialog(dialog.collection ? null : { type: 'products', collection: saved });
                    reload();
                }}
            />

            <CollectionProductsDrawer collection={dialog?.type === 'products' ? dialog.collection : null} open={dialog?.type === 'products'} onClose={() => setDialog(null)} onChanged={reload} />

            <ConfirmDialog
                open={dialog?.type === 'delete'}
                onClose={() => setDialog(null)}
                onConfirm={remove}
                loading={busy}
                icon="trash"
                title={t('حذف تصنيف «{value}»؟', { value: localized(dialog?.collection) })}
                description={t('سيتم حذف التصنيف من متجرك، وتبقى منتجاته كما هي في الكتالوج.')}
                confirmLabel={t('حذف التصنيف')}
            />
        </>
    );
}
