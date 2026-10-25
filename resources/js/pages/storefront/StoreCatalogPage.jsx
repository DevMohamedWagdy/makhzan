import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Display';
import { Icon } from '@/components/ui/Icon';
import { ProductGrid } from '@/features/storefront/ProductCard';
import { useToast } from '@/context/ToastContext';
import { useStorefront } from '@/features/storefront/StorefrontLayout';
import { t } from '@/i18n';
import { cn, formatNumber } from '@/lib/format';
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
    const toast = useToast();
    /** Which listing is on screen; a "load more" page for an older one (sort changed meanwhile) is dropped. */
    const listingKey = `${storeSlug}|${categorySlug}|${search}|${sort}|${mode}`;
    const currentListing = useRef(listingKey);

    currentListing.current = listingKey;

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
        const requestedFor = listingKey;

        setLoadingMore(true);

        try {
            const response = await storefrontApi.products(storeSlug, query(meta.current_page + 1));

            if (currentListing.current === requestedFor) {
                setProducts((current) => [...current, ...response.data]);
                setMeta(response.meta);
            }
        } catch (loadError) {
            toast.error(t('تعذر تحميل المزيد من المنتجات'), loadError.message);
        } finally {
            setLoadingMore(false);
        }
    };

    if (error) {
        return <EmptyState icon="alert-triangle" title={error.status === 404 ? t('القسم غير موجود') : t('تعذر تحميل المنتجات')} description={error.status === 404 ? t('ربما تم نقله أو إخفاؤه.') : error.message} />;
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-5 sm:p-6">
                <nav aria-label={t('مسار التنقل')} className="flex items-center gap-1.5 text-sm text-muted">
                    <Link to={`/${storeSlug}`} className="hover:text-primary">
                        {t('الرئيسية')}
                    </Link>
                    <Icon name="chevron-left" className="size-3.5" />
                    <span className="text-ink-2">{title ?? ' '}</span>
                </nav>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <h1 className="mk-page-title">{title ?? ' '}</h1>
                        {category?.description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{category.description}</p>}
                        {meta && <p className="mt-1 text-sm text-muted">{t('{count} منتج', { count: formatNumber(meta.total) })}</p>}
                    </div>
                    <div className="mk-rail -mx-1 flex items-center gap-2 overflow-x-auto px-1" role="radiogroup" aria-label={t('ترتيب المنتجات')}>
                        <span className="shrink-0 text-sm font-semibold text-ink-2">{t('ترتيب:')}</span>
                        {SORT_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                role="radio"
                                aria-checked={sort === option.value}
                                onClick={() => setSearchParams((previous) => ({ ...Object.fromEntries(previous), sort: option.value }), { replace: true })}
                                className={cn('shrink-0 rounded-full border px-4 py-2 text-sm font-medium whitespace-nowrap transition', sort === option.value ? 'border-primary bg-primary text-white' : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink')}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
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
