import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Display';
import { Input } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { Drawer } from '@/components/ui/Overlay';
import { Skeleton, Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ProductStatusBadge, ProductThumb } from '@/features/products/ProductBadges';
import { useClickOutside, useDebouncedValue } from '@/hooks/common';
import { t } from '@/i18n';
import { formatMoney } from '@/lib/format';
import { collectionsApi, productsApi } from '@/services/productsApi';

/** Search box that finds the store's products by name and adds the chosen one. */
function ProductPicker({ excludedIds, onPick, disabled }) {
    const [term, setTerm] = useState('');
    const search = useDebouncedValue(term, 250);
    const [results, setResults] = useState(null);
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);

    useClickOutside(containerRef, () => setOpen(false), open);

    useEffect(() => {
        if (!open) {
            return;
        }

        setResults(null);
        productsApi
            .list({ search, per_page: 20 })
            .then((response) => setResults(response.data))
            .catch(() => setResults([]));
    }, [search, open]);

    const available = (results ?? []).filter((product) => !excludedIds.includes(product.product_id));
    const placeholder = t('ابحث عن منتج بالاسم لإضافته...');

    return (
        <div ref={containerRef} className="relative">
            <Input
                type="search"
                icon="search"
                value={term}
                disabled={disabled}
                onFocus={() => setOpen(true)}
                onChange={(event) => {
                    setTerm(event.target.value);
                    setOpen(true);
                }}
                placeholder={placeholder}
                aria-label={placeholder}
            />
            {open && (
                <div className="mk-card mk-scroll absolute inset-x-0 top-12 z-20 max-h-80 overflow-y-auto p-1.5 shadow-pop">
                    {results === null ? (
                        <div className="grid place-items-center p-6">
                            <Spinner className="size-5" />
                        </div>
                    ) : available.length === 0 ? (
                        <p className="p-4 text-center text-sm text-muted">{t('لا توجد منتجات مطابقة.')}</p>
                    ) : (
                        available.map((product) => (
                            <button
                                key={product.product_id}
                                type="button"
                                onClick={() => {
                                    onPick(product);
                                    setOpen(false);
                                }}
                                className="flex w-full items-center gap-3 rounded-lg p-2 text-start transition hover:bg-surface-3"
                            >
                                <ProductThumb src={product.image_url} name={product.name} className="size-9" />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-medium text-ink">{product.name}</span>
                                    <span className="text-xs text-muted">{product.category?.name}</span>
                                </span>
                                <Icon name="plus" className="size-4 text-primary" />
                            </button>
                        ))
                    )}
                </div>
            )}
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
    const canEdit = can('products.update');

    useEffect(() => {
        if (!open || !collection) {
            return;
        }

        setProducts(null);
        collectionsApi
            .get(collection.collection_id)
            .then((response) => setProducts(response.products))
            .catch((loadError) => {
                toast.error(t('تعذر تحميل منتجات التصنيف'), loadError.message);
                setProducts([]);
            });
    }, [open, collection, toast]);

    const apply = async (action, failureTitle) => {
        setBusy(true);

        try {
            const updated = await action();

            setProducts(updated.products);
            onChanged(updated);
        } catch (actionError) {
            toast.error(failureTitle, actionError.message);
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
            title={t('منتجات «{name}»', { name: collection?.name ?? '' })}
            description={t('اختر المنتجات التي تظهر في هذا التصنيف ورتّبها كما تريد أن يراها عملاؤك.')}
        >
            <div className="flex flex-col gap-4 p-6">
                {canEdit && (
                    <ProductPicker
                        disabled={busy || products === null}
                        excludedIds={(products ?? []).map((product) => product.product_id)}
                        onPick={(product) => apply(() => collectionsApi.addProducts(collection.collection_id, [product.product_id]), t('تعذر إضافة المنتج'))}
                    />
                )}

                {products === null ? (
                    <div className="flex flex-col gap-3">
                        {[0, 1, 2].map((index) => (
                            <Skeleton key={index} className="h-14 w-full" />
                        ))}
                    </div>
                ) : products.length === 0 ? (
                    <EmptyState icon="box" title={t('لا توجد منتجات في هذا التصنيف')} description={t('ابحث عن منتجاتك بالأعلى وأضفها لتظهر في هذا القسم بالصفحة الرئيسية لمتجرك.')} />
                ) : (
                    <ul className="divide-y divide-line rounded-xl border border-line">
                        {products.map((product, index) => (
                            <li key={product.product_id} className="flex items-center gap-3 p-3">
                                {canEdit && (
                                    <div className="flex flex-col">
                                        <button type="button" onClick={() => move(index, -1)} disabled={busy || index === 0} className="grid size-6 place-items-center rounded text-muted hover:bg-surface-3 hover:text-ink disabled:opacity-30" aria-label={t('نقل {name} لأعلى', { name: product.name })}>
                                            <Icon name="chevron-down" className="size-4 rotate-180" />
                                        </button>
                                        <button type="button" onClick={() => move(index, 1)} disabled={busy || index === products.length - 1} className="grid size-6 place-items-center rounded text-muted hover:bg-surface-3 hover:text-ink disabled:opacity-30" aria-label={t('نقل {name} لأسفل', { name: product.name })}>
                                            <Icon name="chevron-down" className="size-4" />
                                        </button>
                                    </div>
                                )}
                                <ProductThumb src={product.image_url} name={product.name} className="size-10" />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-ink">{product.name}</p>
                                    {product.price != null && <p className="text-xs text-muted">{formatMoney(product.price)}</p>}
                                </div>
                                {product.status !== 'active' && <ProductStatusBadge status={product.status} />}
                                {canEdit && (
                                    <Button
                                        variant="danger-soft"
                                        size="icon"
                                        disabled={busy}
                                        onClick={() => apply(() => collectionsApi.removeProduct(collection.collection_id, product.product_id), t('تعذر إزالة المنتج'))}
                                        aria-label={t('إزالة {name} من التصنيف', { name: product.name })}
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
