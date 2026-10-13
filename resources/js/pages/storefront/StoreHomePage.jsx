import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/ui/Display';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Spinner';
import { ProductGrid, ProductImage } from '@/features/storefront/ProductCard';
import { useStorefront } from '@/features/storefront/StorefrontLayout';
import { t } from '@/i18n';

function SectionHeader({ title, action }) {
    return (
        <div className="mb-4 flex items-end justify-between gap-3">
            <h2 className="text-xl font-bold text-ink sm:text-2xl">{title}</h2>
            {action}
        </div>
    );
}

/** Store landing page: hero, categories, featured and newest products. */
export function StoreHomePage() {
    const { storeSlug, store, categories, featured, latest } = useStorefront();
    const loading = !store;

    useEffect(() => {
        if (store) {
            document.title = store.name;
        }
    }, [store]);

    if (!loading && latest.length === 0) {
        return <EmptyState icon="store" title={t('المتجر يجهّز منتجاته')} description={t('لا توجد منتجات معروضة حالياً، عُد قريباً لتشاهد أحدث التشكيلات.')} />;
    }

    return (
        <div className="flex flex-col gap-12">
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-sky-500 px-6 py-12 text-white sm:px-12 sm:py-16">
                <div className="absolute -top-16 -end-16 size-64 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
                <div className="absolute -bottom-20 start-1/3 size-72 rounded-full bg-sky-300/20 blur-3xl" aria-hidden="true" />
                <div className="relative max-w-xl">
                    {loading ? (
                        <Skeleton className="h-10 w-64 bg-white/20" />
                    ) : (
                        <>
                            <p className="text-sm font-medium text-indigo-100">{t('أهلاً بك في')}</p>
                            <h1 className="mt-2 text-3xl leading-tight font-extrabold sm:text-5xl">{store.name}</h1>
                            <p className="mt-4 text-base leading-relaxed text-indigo-50">{t('تسوّق أحدث التشكيلات بأفضل الأسعار، والدفع عند الاستلام.')}</p>
                            <Link to={`/${storeSlug}/products`} className="mt-6 inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-indigo-700 shadow-lg transition hover:bg-indigo-50">
                                {t('تسوّق الآن')}
                                <Icon name="arrow-left" className="size-4" />
                            </Link>
                        </>
                    )}
                </div>
            </section>

            {categories?.length > 0 && (
                <section>
                    <SectionHeader title={t('تسوّق حسب القسم')} />
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                        {categories.map((category) => (
                            <Link key={category.slug} to={`/${storeSlug}/c/${category.slug}`} className="group overflow-hidden rounded-2xl border border-line bg-surface transition hover:-translate-y-0.5 hover:shadow-lg">
                                <div className="aspect-square overflow-hidden bg-surface-2">
                                    {category.image_url ? (
                                        <ProductImage src={category.image_url} alt={category.name} className="transition duration-500 group-hover:scale-105" />
                                    ) : (
                                        <span className="grid size-full place-items-center bg-gradient-to-br from-primary-soft to-surface-2 text-3xl font-extrabold text-primary">{category.name.charAt(0)}</span>
                                    )}
                                </div>
                                <div className="p-3 text-center">
                                    <p className="truncate text-sm font-semibold text-ink group-hover:text-primary">{category.name}</p>
                                    <p className="text-xs text-muted">{t('{count} منتج', { count: category.products_count })}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {(loading || featured.length > 0) && (
                <section>
                    <SectionHeader title={t('منتجات مميزة')} />
                    <ProductGrid storeSlug={storeSlug} products={featured ?? []} loading={loading} skeletonCount={4} />
                </section>
            )}

            <section>
                <SectionHeader
                    title={t('وصل حديثاً')}
                    action={
                        <Link to={`/${storeSlug}/products`} className="text-sm font-semibold text-primary hover:underline">
                            {t('عرض الكل')}
                        </Link>
                    }
                />
                <ProductGrid storeSlug={storeSlug} products={latest ?? []} loading={loading} />
            </section>
        </div>
    );
}
