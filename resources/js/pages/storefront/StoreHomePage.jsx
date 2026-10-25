import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/ui/Display';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Spinner';
import { ProductGrid, ProductImage, ProductRail } from '@/features/storefront/ProductCard';
import { useStorefront } from '@/features/storefront/StorefrontLayout';
import { t } from '@/i18n';

function SectionHeader({ title, to }) {
    return (
        <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-ink sm:text-[22px] sm:leading-8">{title}</h2>
            {to && (
                <Link to={to} className="inline-flex h-8 items-center gap-1 rounded-full border border-line-strong/70 bg-surface px-3.5 text-xs font-medium text-ink-2 transition hover:border-primary hover:text-primary sm:text-[13px]">
                    {t('عرض الكل')}
                    <Icon name="chevron-left" className="size-4" />
                </Link>
            )}
        </div>
    );
}

/** Main banner: the store's name and a call to action, with a few product photos fanned out beside it. */
function HeroBanner({ storeSlug, store, products }) {
    const photos = products.filter((product) => product.image_url).slice(0, 3);

    return (
        <Link to={`/${storeSlug}/products`} className="group relative flex min-h-64 overflow-hidden rounded-3xl bg-panel p-6 text-white sm:min-h-80 sm:p-10 lg:col-span-2">
            <div className="mk-grid-texture absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent)]" aria-hidden="true" />
            <div className="absolute -top-32 -end-20 size-96 rounded-full bg-brand-green/25 blur-3xl" aria-hidden="true" />
            <div className="absolute -bottom-40 start-1/4 size-80 rounded-full bg-brand-green/10 blur-3xl" aria-hidden="true" />
            <div className="relative flex max-w-md flex-col justify-center">
                <span className="mk-overline w-fit text-brand-green">{t('أهلاً بك في')}</span>
                <h1 className="mt-3 text-[32px] leading-tight font-bold sm:text-[52px] sm:leading-[1.1]">{store.name}</h1>
                <p className="mt-4 text-sm leading-relaxed text-panel-text sm:text-base">{store.description || t('تسوّق أحدث التشكيلات بأفضل الأسعار، والدفع عند الاستلام.')}</p>
                <span className="mt-7 inline-flex h-12 w-fit items-center gap-2 rounded-xl bg-brand-green px-6 text-sm font-semibold text-brand shadow-[inset_0_1px_0_rgb(255_255_255/0.35)] transition group-hover:gap-3">
                    {t('تسوّق الآن')}
                    <Icon name="arrow-left" className="size-4" />
                </span>
            </div>
            {photos.length > 0 && (
                <div className="pointer-events-none absolute inset-y-6 end-6 hidden w-2/5 items-center justify-center sm:flex">
                    {photos.map((product, index) => (
                        <div
                            key={product.product_id}
                            className="absolute aspect-[4/5] w-[46%] overflow-hidden rounded-2xl border-[3px] border-white/90 shadow-pop transition duration-500 group-hover:scale-105"
                            style={{ transform: `translateX(${(index - 1) * 55}%) rotate(${(index - 1) * 8}deg)`, zIndex: index === 1 ? 2 : 1 }}
                        >
                            <ProductImage src={product.image_url} alt="" />
                        </div>
                    ))}
                </div>
            )}
        </Link>
    );
}

/** Smaller side banner pointing into the catalog. */
function PromoCard({ to, eyebrow, title, product, tone }) {
    return (
        <Link to={to} className={`group relative flex min-h-28 items-center justify-between gap-4 overflow-hidden rounded-3xl p-4 sm:p-6 ${tone}`}>
            <div className="relative">
                <p className="mk-overline text-primary">{eyebrow}</p>
                <p className="mt-1.5 text-base leading-snug font-bold sm:text-xl">{title}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 group-hover:underline">
                    {t('تسوّق الآن')}
                    <Icon name="chevron-left" className="size-4" />
                </span>
            </div>
            <div className="hidden size-28 shrink-0 overflow-hidden rounded-2xl bg-surface shadow-raise ring-1 ring-line transition duration-500 group-hover:scale-105 sm:block">
                <ProductImage src={product?.image_url} alt="" />
            </div>
        </Link>
    );
}

function CategoryCircles({ storeSlug, categories }) {
    return (
        <div className="mk-rail -mx-4 flex gap-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:gap-6 sm:px-0">
            {categories.map((category) => (
                <Link key={category.slug} to={`/${storeSlug}/c/${category.slug}`} className="group flex w-20 shrink-0 flex-col items-center gap-2 text-center sm:w-24">
                    <span className="size-20 overflow-hidden rounded-full border border-line-strong/70 bg-surface p-1 shadow-card transition group-hover:border-primary group-hover:shadow-[0_0_0_3px_var(--mk-ring)] sm:size-24">
                        {category.image_url ? (
                            <span className="block size-full overflow-hidden rounded-full">
                                <ProductImage src={category.image_url} alt={category.name} className="transition duration-500 group-hover:scale-110" />
                            </span>
                        ) : (
                            <span className="grid size-full place-items-center rounded-full bg-primary-soft text-2xl font-semibold text-primary">{category.name.charAt(0)}</span>
                        )}
                    </span>
                    <span className="line-clamp-2 text-xs font-medium text-ink group-hover:text-primary sm:text-[13px]">{category.name}</span>
                </Link>
            ))}
        </div>
    );
}

function HomeSkeleton() {
    return (
        <div className="flex flex-col gap-10">
            <div className="grid gap-4 lg:grid-cols-3">
                <Skeleton className="h-64 rounded-3xl sm:h-80 lg:col-span-2" />
                <div className="hidden flex-col gap-4 lg:flex">
                    <Skeleton className="flex-1 rounded-3xl" />
                    <Skeleton className="flex-1 rounded-3xl" />
                </div>
            </div>
            <div className="flex gap-6">
                {Array.from({ length: 6 }, (_, index) => (
                    <Skeleton key={index} className="size-20 shrink-0 rounded-full sm:size-24" />
                ))}
            </div>
            <ProductRail loading />
        </div>
    );
}

/** Store landing page: banners, categories, the merchant's collections, featured and newest products. */
export function StoreHomePage() {
    const { storeSlug, store, categories, collections, featured, latest } = useStorefront();

    useEffect(() => {
        if (store) {
            document.title = store.name;
        }
    }, [store]);

    if (!store) {
        return <HomeSkeleton />;
    }

    if (latest.length === 0) {
        return <EmptyState icon="store" title={t('المتجر يجهّز منتجاته')} description={t('لا توجد منتجات معروضة حالياً، عُد قريباً لتشاهد أحدث التشكيلات.')} />;
    }

    // Only promise discounts when the store actually has some.
    const onSale = latest.find((product) => product.discount_percent > 0);
    const firstPromo = onSale
        ? { eyebrow: t('عروض'), title: t('خصومات على منتجات مختارة'), product: onSale }
        : { eyebrow: t('تشكيلتنا'), title: t('تصفّح كل المنتجات'), product: featured[0] ?? latest[1] ?? latest[0] };

    return (
        <div className="flex flex-col gap-10 sm:gap-12">
            <section className="grid gap-4 lg:grid-cols-3">
                <HeroBanner storeSlug={storeSlug} store={store} products={featured.length ? featured : latest} />
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-1">
                    <PromoCard to={`/${storeSlug}/products`} {...firstPromo} tone="bg-primary-soft text-ink ring-1 ring-primary/10 ring-inset" />
                    <PromoCard to={`/${storeSlug}/products?sort=newest`} eyebrow={t('جديد')} title={t('وصل حديثاً')} product={latest[0]} tone="border border-line bg-surface text-ink shadow-card" />
                </div>
            </section>

            {categories.length > 0 && (
                <section>
                    <SectionHeader title={t('تسوّق حسب القسم')} />
                    <CategoryCircles storeSlug={storeSlug} categories={categories} />
                </section>
            )}

            {collections?.map((collection) => (
                <section key={collection.collection_id}>
                    <SectionHeader title={collection.name} />
                    <ProductRail storeSlug={storeSlug} products={collection.products} />
                </section>
            ))}

            {featured.length > 0 && (
                <section>
                    <SectionHeader title={t('منتجات مميزة')} to={`/${storeSlug}/products`} />
                    <ProductRail storeSlug={storeSlug} products={featured} />
                </section>
            )}

            <section>
                <SectionHeader title={t('وصل حديثاً')} to={`/${storeSlug}/products`} />
                <ProductGrid storeSlug={storeSlug} products={latest} />
            </section>
        </div>
    );
}
