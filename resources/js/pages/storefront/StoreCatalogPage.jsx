import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Display';
import { Select } from '@/components/ui/Form';
import { ProductGrid } from '@/features/storefront/ProductCard';
import { useStorefront } from '@/features/storefront/StorefrontLayout';
import { t } from '@/i18n';
import { formatNumber } from '@/lib/format';
import { storefrontApi } from '@/services/storefrontApi';

const SORT_OPTIONS = [
    { value: 'newest', label: t('الأحدث') },
    { value: 'price_asc', label: t('السعر: من الأقل للأعلى') },
    { value: 'price_desc', label: t('السعر: من الأعلى للأقل') },
];

/** All products, one category (/c/:categorySlug) or search results (/search?q=), with sorting. */
export function StoreCatalogPage({ mode = 'all' }) {
    const { storeSlug, categorySlug } = useParams();
    const { store } = useStorefront();
    const [searchParams, setSearchParams] = useSearchParams();
    const search = mode === 'search' ? (searchParams.get('q') ?? '') : '';
    const sort = searchParams.get('sort') ?? 'newest';
    const [products, setProducts] = useState(null);
    const [meta, setMeta] = useState(null);
    const [category, setCategory] = useState(null);
    const [error, setError] = useState(null);
    const [loadingMore, setLoadingMore] = useState(false);

    const query = (page) => ({ category: mode === 'category' ? categorySlug : undefined, search: search || undefined, sort, page });

    useEffect(() => {
        let cancelled = false;

        setProducts(null);
        setError(null);
        storefrontApi
            .products(storeSlug, query(1))
            .then((response) => {
                if (!cancelled) {
                    setProducts(response.data);
                    setMeta(response.meta);
                    setCategory(response.category);
                }
            })
            .catch((loadError) => !cancelled && setError(loadError));

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storeSlug, categorySlug, search, sort, mode]);

    const title = mode === 'category' ? category?.name : mode === 'search' ? t('نتائج البحث عن «{term}»', { term: search }) : t('كل المنتجات');

    useEffect(() => {
        if (store && title) {
            document.title = `${title} | ${store.name}`;
        }
    }, [store, title]);

    const loadMore = async () => {
        setLoadingMore(true);

        try {
            const response = await storefrontApi.products(storeSlug, query(meta.current_page + 1));

            setProducts((current) => [...current, ...response.data]);
            setMeta(response.meta);
        } finally {
            setLoadingMore(false);
        }
    };

    if (error) {
        return <EmptyState icon="alert-triangle" title={error.status === 404 ? t('القسم غير موجود') : t('تعذر تحميل المنتجات')} description={error.status === 404 ? t('ربما تم نقله أو إخفاؤه.') : error.message} />;
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-ink sm:text-3xl">{title ?? ' '}</h1>
                    {category?.description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{category.description}</p>}
                    {meta && <p className="mt-1 text-sm text-muted">{t('{count} منتج', { count: formatNumber(meta.total) })}</p>}
                </div>
                <Select
                    aria-label={t('ترتيب المنتجات')}
                    value={sort}
                    onChange={(event) => setSearchParams((previous) => ({ ...Object.fromEntries(previous), sort: event.target.value }), { replace: true })}
                    options={SORT_OPTIONS}
                    className="sm:w-56"
                />
            </div>

            {products && products.length === 0 ? (
                <EmptyState icon="search" title={mode === 'search' ? t('لا توجد نتائج') : t('لا توجد منتجات هنا بعد')} description={mode === 'search' ? t('جرّب كلمات بحث أخرى.') : t('عُد قريباً لتشاهد الجديد.')} />
            ) : (
                <ProductGrid storeSlug={storeSlug} products={products ?? []} loading={!products} />
            )}

            {meta && meta.current_page < meta.last_page && (
                <Button variant="secondary" size="lg" loading={loadingMore} onClick={loadMore} className="self-center">
                    {t('عرض المزيد')}
                </Button>
            )}
        </div>
    );
}
