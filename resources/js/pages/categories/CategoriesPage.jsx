import { useState } from 'react';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Badge, EmptyState } from '@/components/ui/Display';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { CategoryFormModal } from '@/features/products/CategoryFormModal';
import { ProductThumb } from '@/features/products/ProductBadges';
import { useCategories } from '@/features/products/useCategories';
import { localized, t } from '@/i18n';
import { cn, formatNumber } from '@/lib/format';
import { categoriesApi } from '@/services/productsApi';

/** The store's catalog sections: add, edit, reorder, hide and delete (when empty). */
export function CategoriesPage() {
    const { can } = useAuth();
    const toast = useToast();
    const { categories, error, reload } = useCategories();
    /** @type {[{ type: 'form' | 'delete', category?: object } | null, Function]} */
    const [dialog, setDialog] = useState(null);
    const [busy, setBusy] = useState(false);

    const move = async (index, direction) => {
        const ordered = [...categories];
        const [moved] = ordered.splice(index, 1);

        ordered.splice(index + direction, 0, moved);
        setBusy(true);

        try {
            await Promise.all(ordered.map((category, position) => category.position !== position && categoriesApi.update(category.category_id, { name: category.name, position })).filter(Boolean));
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
            await categoriesApi.remove(dialog.category.category_id);
            toast.success(t('تم حذف القسم'));
            setDialog(null);
            reload();
        } catch (removeError) {
            toast.error(t('تعذر حذف القسم'), removeError.errors?.category ?? removeError.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <PageHeader
                title={t('الأقسام')}
                description={t('نظّم منتجاتك في أقسام تظهر في متجرك. كل منتج يجب أن يتبع قسماً.')}
                breadcrumbs={[t('لوحة التحكم'), t('الكتالوج'), t('الأقسام')]}
                actions={
                    can('categories.create') && (
                        <Button icon="plus" onClick={() => setDialog({ type: 'form' })}>
                            {t('إضافة قسم')}
                        </Button>
                    )
                }
            />

            <section className="mk-card overflow-hidden">
                {error ? (
                    <div className="p-6">
                        <EmptyState icon="alert-triangle" title={t('تعذر تحميل الأقسام')} description={error} action={<Button variant="secondary" icon="refresh" onClick={reload}>{t('إعادة المحاولة')}</Button>} />
                    </div>
                ) : !categories ? (
                    <div className="flex flex-col gap-3 p-4">
                        {[0, 1, 2].map((index) => (
                            <Skeleton key={index} className="h-16 w-full" />
                        ))}
                    </div>
                ) : categories.length === 0 ? (
                    <div className="p-6">
                        <EmptyState
                            icon="grid"
                            title={t('لا توجد أقسام بعد')}
                            description={t('ابدأ بإضافة الأقسام التي تعمل بها، مثل: فساتين، عبايات، إكسسوارات، ثم أضف منتجاتك إليها.')}
                            action={
                                can('categories.create') && <Button icon="plus" onClick={() => setDialog({ type: 'form' })}>
                                    {t('إضافة أول قسم')}
                                </Button>
                            }
                        />
                    </div>
                ) : (
                    <ul className="divide-y divide-line">
                        {categories.map((category, index) => (
                            <li key={category.category_id} className="flex flex-wrap items-center gap-4 p-4">
                                <div className={cn('flex flex-col', !can('categories.update') && 'hidden')}>
                                    <button type="button" onClick={() => move(index, -1)} disabled={busy || index === 0} className="grid size-6 place-items-center rounded text-muted hover:bg-surface-3 hover:text-ink disabled:opacity-30" aria-label={t('نقل {name} لأعلى', { name: localized(category) })}>
                                        <Icon name="chevron-down" className="size-4 rotate-180" />
                                    </button>
                                    <button type="button" onClick={() => move(index, 1)} disabled={busy || index === categories.length - 1} className="grid size-6 place-items-center rounded text-muted hover:bg-surface-3 hover:text-ink disabled:opacity-30" aria-label={t('نقل {name} لأسفل', { name: localized(category) })}>
                                        <Icon name="chevron-down" className="size-4" />
                                    </button>
                                </div>
                                <ProductThumb src={category.image_url} name={localized(category)} />
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-semibold text-ink">{localized(category)}</span>
                                        {!category.is_active && <Badge tone="neutral" icon="eye-off">{t('مخفي من المتجر')}</Badge>}
                                    </div>
                                    {category.description && <p className="mt-0.5 truncate text-xs text-muted">{localized(category, 'description')}</p>}
                                </div>
                                <Button variant="ghost" size="sm" to={`/dashboard/products?category_id=${category.category_id}`}>
                                    {t('{value} منتج', { value: formatNumber(category.products_count) })}
                                </Button>
                                <div className="flex gap-1">
                                    {can('categories.update') && (
                                        <Button variant="secondary" size="sm" icon="edit" onClick={() => setDialog({ type: 'form', category })}>
                                            {t('تعديل')}
                                        </Button>
                                    )}
                                    {can('categories.delete') && (
                                        <Button variant="danger-soft" size="icon" onClick={() => (category.products_count ? toast.error(t('لا يمكن حذف هذا القسم'), t('به {products_count} منتج. انقل منتجاته لقسم آخر أولاً، ثم احذفه.', { products_count: category.products_count })) : setDialog({ type: 'delete', category }))} aria-label={t('حذف {name}', { name: localized(category) })} title={t('حذف')}>
                                            <Icon name="trash" className="size-4" />
                                        </Button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <CategoryFormModal
                category={dialog?.type === 'form' ? (dialog.category ?? null) : null}
                open={dialog?.type === 'form'}
                onClose={() => setDialog(null)}
                onSaved={(saved) => {
                    toast.success(dialog.category ? t('تم حفظ القسم') : t('تمت إضافة القسم'), localized(saved));
                    setDialog(null);
                    reload();
                }}
            />

            <ConfirmDialog
                open={dialog?.type === 'delete'}
                onClose={() => setDialog(null)}
                onConfirm={remove}
                loading={busy}
                icon="trash"
                title={t('حذف قسم «{value}»؟', { value: localized(dialog?.category) })}
                description={t('سيتم حذف القسم نهائياً.')}
                confirmLabel={t('حذف القسم')}
            />
        </>
    );
}
