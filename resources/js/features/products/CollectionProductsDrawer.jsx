import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Display';
import { Icon } from '@/components/ui/Icon';
import { Drawer } from '@/components/ui/Overlay';
import { Tabs } from '@/components/ui/Navigation';
import { Skeleton } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ProductStatusBadge, ProductThumb } from '@/features/products/ProductBadges';
import { localized, t } from '@/i18n';
import { cn, formatMoney, formatNumber } from '@/lib/format';
import { collectionsApi, productsApi } from '@/services/productsApi';

/** Loads every product in the store, following the pages of the products list. */
async function fetchAllProducts() {
    const products = [];

    for (let page = 1; ; page++) {
        const response = await productsApi.list({ per_page: 50, page });

        products.push(...response.data);

        if (page >= response.meta.last_page) {
            return products;
        }
    }
}

/**
 * The store's products that are not in the collection yet, as cards that all start unchecked.
 * The merchant checks the ones they want and adds them together with `onAdd(productIds)`.
 */
function ProductChooser({ allProducts, addedIds, onAdd, disabled }) {
    const [categoryId, setCategoryId] = useState('all');
    const [checkedIds, setCheckedIds] = useState([]);

    if (allProducts.length === 0) {
        return <EmptyState icon="box" title={t('لا توجد منتجات في متجرك بعد')} description={t('أضف منتجاتك أولاً ثم اخترها هنا لتظهر في هذا التصنيف.')} />;
    }

    const available = allProducts.filter((product) => !addedIds.includes(product.product_id));

    if (available.length === 0) {
        return <EmptyState icon="check-circle" title={t('كل منتجاتك مضافة لهذا التصنيف')} description={t('يمكنك ترتيبها أو إزالة ما لا تريده من تبويب «منتجات التصنيف».')} />;
    }

    const categories = [...new Map(available.filter((product) => product.category).map((product) => [product.category.category_id, localized(product.category)])).entries()];
    const visible = categoryId === 'all' ? available : available.filter((product) => product.category?.category_id === categoryId);
    const chipClass = (active) => cn('shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition', active ? 'border-primary bg-primary-soft text-primary' : 'border-line text-ink-2 hover:border-line-strong');
    const toggle = (productId) => setCheckedIds((current) => (current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId]));

    const addChecked = async () => {
        if (await onAdd(checkedIds)) {
            setCheckedIds([]);
        }
    };

    return (
        <div className="flex flex-col gap-4">
            {categories.length > 1 && (
                <div className="mk-scroll flex gap-2 overflow-x-auto pb-1">
                    <button type="button" onClick={() => setCategoryId('all')} className={chipClass(categoryId === 'all')}>
                        {t('الكل')} ({formatNumber(available.length)})
                    </button>
                    {categories.map(([id, name]) => (
                        <button key={id} type="button" onClick={() => setCategoryId(id)} className={chipClass(categoryId === id)}>
                            {name}
                        </button>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {visible.map((product) => {
                    const isChecked = checkedIds.includes(product.product_id);

                    return (
                        <button
                            key={product.product_id}
                            type="button"
                            disabled={disabled}
                            onClick={() => toggle(product.product_id)}
                            aria-pressed={isChecked}
                            className={cn(
                                'relative flex flex-col overflow-hidden rounded-xl border text-start transition disabled:cursor-wait',
                                isChecked ? 'border-primary bg-primary-soft' : 'border-line bg-surface hover:border-line-strong',
                            )}
                        >
                            <ProductThumb src={product.image_url} name={localized(product)} className="aspect-square h-auto w-full !rounded-none !border-0" />
                            <span className={cn('absolute start-2 top-2 grid size-6 place-items-center rounded-full border-2 transition', isChecked ? 'border-primary bg-primary text-white' : 'border-white bg-black/25')}>
                                {isChecked && <Icon name="check" strokeWidth={3} className="size-3.5" />}
                            </span>
                            <span className="flex flex-col gap-0.5 p-2.5">
                                <span className="truncate text-sm font-semibold text-ink">{localized(product)}</span>
                                {product.price != null && <span className="text-xs text-muted">{formatMoney(product.price)}</span>}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="sticky bottom-0 -mx-6 -mb-6 flex items-center justify-between gap-3 border-t border-line bg-surface px-6 py-4">
                <p className="text-sm text-muted">
                    {checkedIds.length > 0 ? t('تم اختيار {count} منتج', { count: formatNumber(checkedIds.length) }) : t('اختر المنتجات التي تريد إضافتها')}
                </p>
                <div className="flex gap-2">
                    {checkedIds.length > 0 && (
                        <Button variant="ghost" disabled={disabled} onClick={() => setCheckedIds([])}>
                            {t('إلغاء التحديد')}
                        </Button>
                    )}
                    <Button icon="plus" disabled={disabled || checkedIds.length === 0} loading={disabled && checkedIds.length > 0} onClick={addChecked}>
                        {t('إضافة للتصنيف')}
                    </Button>
                </div>
            </div>
        </div>
    );
}

/**
 * Adds, removes and orders the products of a collection. Calls `onChanged(collection)` after each change.
 * @param {{ collection: object | null, open: boolean, onClose: Function, onChanged: Function }} props
 */
export function CollectionProductsDrawer({ collection, open, onClose, onChanged }) {
    const { can } = useAuth();
    const toast = useToast();
    const [products, setProducts] = useState(null);
    const [busy, setBusy] = useState(false);
    const [tab, setTab] = useState('choose');
    const [loadError, setLoadError] = useState(null);
    const [attempt, setAttempt] = useState(0);
    /** Every product in the store for the chooser, loaded once each time the drawer opens. */
    const [storeProducts, setStoreProducts] = useState(null);
    const canEdit = can('collections.update');

    // A response that arrives after the drawer moved on to another collection (or closed) is ignored.
    useEffect(() => {
        if (!open || !collection) {
            return undefined;
        }

        let current = true;

        setProducts(null);
        setLoadError(null);
        setTab(canEdit ? 'choose' : 'order');
        collectionsApi
            .get(collection.collection_id)
            .then((response) => current && setProducts(response.products))
            .catch((error) => current && setLoadError(error.message));

        return () => {
            current = false;
        };
    }, [open, collection, canEdit, attempt]);

    useEffect(() => {
        if (!open || !canEdit) {
            return undefined;
        }

        let current = true;

        setStoreProducts(null);
        fetchAllProducts()
            .then((loaded) => current && setStoreProducts(loaded))
            .catch((error) => current && setLoadError(error.message));

        return () => {
            current = false;
        };
    }, [open, canEdit, attempt]);

    const apply = async (action, failureTitle) => {
        setBusy(true);

        try {
            const updated = await action();

            setProducts(updated.products);
            onChanged(updated);

            return true;
        } catch (actionError) {
            toast.error(failureTitle, actionError.message);

            return false;
        } finally {
            setBusy(false);
        }
    };

    const move = (index, direction) => {
        const ordered = [...products];
        const [moved] = ordered.splice(index, 1);

        ordered.splice(index + direction, 0, moved);
        apply(() => collectionsApi.reorderProducts(collection.collection_id, ordered.map((product) => product.product_id)), t('تعذر تغيير الترتيب'));
    };

    return (
        <Drawer
            open={open}
            onClose={onClose}
            icon="box"
            title={t('منتجات «{name}»', { name: localized(collection) })}
            description={t('اختر المنتجات التي تظهر في هذا التصنيف ورتّبها كما تريد أن يراها عملاؤك.')}
        >
            <div className="flex flex-col gap-4 p-6">
                {loadError && (
                    <EmptyState
                        icon="alert-triangle"
                        title={t('تعذر تحميل منتجات التصنيف')}
                        description={loadError}
                        action={
                            <Button variant="secondary" icon="refresh" onClick={() => setAttempt((count) => count + 1)}>
                                {t('إعادة المحاولة')}
                            </Button>
                        }
                    />
                )}

                {!loadError && canEdit && (
                    <Tabs
                        value={tab}
                        onChange={setTab}
                        tabs={[
                            { value: 'choose', label: t('اختيار المنتجات'), icon: 'grid' },
                            { value: 'order', label: t('منتجات التصنيف'), icon: 'filter', count: products?.length ?? 0 },
                        ]}
                    />
                )}

                {loadError ? null : tab === 'choose' && canEdit ? (
                    products === null || storeProducts === null ? (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            {[0, 1, 2, 3, 4, 5].map((index) => (
                                <Skeleton key={index} className="h-48 w-full" />
                            ))}
                        </div>
                    ) : (
                        <ProductChooser
                            allProducts={storeProducts}
                            disabled={busy}
                            addedIds={products.map((product) => product.product_id)}
                            onAdd={(productIds) => apply(() => collectionsApi.addProducts(collection.collection_id, productIds), t('تعذر إضافة المنتجات'))}
                        />
                    )
                ) : products === null ? (
                    <div className="flex flex-col gap-3">
                        {[0, 1, 2].map((index) => (
                            <Skeleton key={index} className="h-14 w-full" />
                        ))}
                    </div>
                ) : products.length === 0 ? (
                    <EmptyState icon="box" title={t('لا توجد منتجات في هذا التصنيف')} description={canEdit ? t('اختر منتجاتك من تبويب «اختيار المنتجات» لتظهر في هذا القسم بالصفحة الرئيسية لمتجرك.') : undefined} />
                ) : (
                    <ul className="divide-y divide-line rounded-xl border border-line">
                        {products.map((product, index) => (
                            <li key={product.product_id} className="flex items-center gap-3 p-3">
                                {canEdit && (
                                    <div className="flex flex-col">
                                        <button type="button" onClick={() => move(index, -1)} disabled={busy || index === 0} className="grid size-6 place-items-center rounded text-muted hover:bg-surface-3 hover:text-ink disabled:opacity-30" aria-label={t('نقل {name} لأعلى', { name: localized(product) })}>
                                            <Icon name="chevron-down" className="size-4 rotate-180" />
                                        </button>
                                        <button type="button" onClick={() => move(index, 1)} disabled={busy || index === products.length - 1} className="grid size-6 place-items-center rounded text-muted hover:bg-surface-3 hover:text-ink disabled:opacity-30" aria-label={t('نقل {name} لأسفل', { name: localized(product) })}>
                                            <Icon name="chevron-down" className="size-4" />
                                        </button>
                                    </div>
                                )}
                                <ProductThumb src={product.image_url} name={localized(product)} className="size-10" />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-ink">{localized(product)}</p>
                                    {product.price != null && <p className="text-xs text-muted">{formatMoney(product.price)}</p>}
                                </div>
                                {product.status !== 'active' && <ProductStatusBadge status={product.status} />}
                                {canEdit && (
                                    <Button
                                        variant="danger-soft"
                                        size="icon"
                                        disabled={busy}
                                        onClick={() => apply(() => collectionsApi.removeProduct(collection.collection_id, product.product_id), t('تعذر إزالة المنتج'))}
                                        aria-label={t('إزالة {name} من التصنيف', { name: localized(product) })}
                                        title={t('إزالة')}
                                    >
                                        <Icon name="x" className="size-4" />
                                    </Button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </Drawer>
    );
}
