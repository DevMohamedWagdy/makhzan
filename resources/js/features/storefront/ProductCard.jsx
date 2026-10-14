import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Spinner';
import { t } from '@/i18n';
import { formatMoney, formatNumber } from '@/lib/format';

export function ProductImage({ src, alt, className = '' }) {
    return src ? (
        <img src={src} alt={alt} loading="lazy" className={`size-full object-cover ${className}`} />
    ) : (
        <span className={`grid size-full place-items-center bg-gradient-to-br from-surface-3 to-surface-2 text-muted ${className}`}>
            <svg viewBox="0 0 24 24" className="size-10 opacity-60" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <circle cx="9" cy="10" r="2" />
                <path d="m21 16-5-5-9 9" />
            </svg>
        </span>
    );
}

export function PriceTag({ price, priceMax, compareAtPrice, size = 'md' }) {
    const isRange = priceMax !== null && priceMax !== undefined && priceMax !== price;

    return (
        <span className="flex flex-wrap items-baseline gap-x-2">
            <span className={size === 'lg' ? 'text-2xl font-bold text-ink' : 'font-bold text-ink'}>{isRange ? t('من {price}', { price: formatMoney(price) }) : formatMoney(price)}</span>
            {compareAtPrice && <span className={size === 'lg' ? 'text-base text-muted line-through' : 'text-xs text-muted line-through'}>{formatMoney(compareAtPrice)}</span>}
        </span>
    );
}

/** Listing card: image (second image on hover), discount and sold-out badges, name and price. */
export function ProductCard({ storeSlug, product }) {
    return (
        <Link to={`/${storeSlug}/p/${product.slug}`} className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface transition hover:-translate-y-0.5 hover:shadow-lg">
            <div className="relative aspect-[4/5] overflow-hidden bg-surface-2">
                <ProductImage src={product.image_url} alt={product.name} className="transition duration-500 group-hover:scale-105" />
                {product.hover_image_url && <img src={product.hover_image_url} alt="" loading="lazy" className="absolute inset-0 size-full object-cover opacity-0 transition duration-500 group-hover:opacity-100" />}
                <div className="absolute top-2.5 start-2.5 flex flex-col items-start gap-1.5">
                    {product.discount_percent > 0 && <span className="rounded-full bg-danger px-2.5 py-1 text-[11px] font-bold text-white">{t('خصم {percent}%', { percent: product.discount_percent })}</span>}
                    {!product.in_stock && <span className="rounded-full bg-slate-900/80 px-2.5 py-1 text-[11px] font-semibold text-white">{t('نفد المخزون')}</span>}
                </div>
            </div>
            <div className="flex flex-1 flex-col gap-1.5 p-3.5">
                <span className="text-xs text-muted">{product.category.name}</span>
                <span className="line-clamp-2 text-sm font-semibold text-ink group-hover:text-primary">{product.name}</span>
                {product.reviews_count > 0 && (
                    <span className="flex items-center gap-1 text-xs text-muted">
                        <Icon name="star" className="size-3.5 fill-amber-400 text-amber-400" />
                        {t('{rating} ({count})', { rating: formatNumber(product.rating_average), count: formatNumber(product.reviews_count) })}
                    </span>
                )}
                <span className="mt-auto pt-1">
                    <PriceTag price={product.price} priceMax={product.price_max} compareAtPrice={product.compare_at_price} />
                </span>
            </div>
        </Link>
    );
}

export function ProductGrid({ storeSlug, products, loading = false, skeletonCount = 8 }) {
    if (loading) {
        return (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: skeletonCount }, (_, index) => (
                    <div key={index} className="overflow-hidden rounded-2xl border border-line bg-surface">
                        <Skeleton className="aspect-[4/5] w-full rounded-none" />
                        <div className="flex flex-col gap-2 p-3.5">
                            <Skeleton className="h-3 w-16" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-20" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
                <ProductCard key={product.product_id} storeSlug={storeSlug} product={product} />
            ))}
        </div>
    );
}
