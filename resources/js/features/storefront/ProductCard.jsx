import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Spinner';
import { t } from '@/i18n';
import { cn, formatMoney, formatNumber } from '@/lib/format';
import { WishlistButton } from './WishlistButton';

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
        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className={size === 'lg' ? 'mk-num text-3xl font-semibold text-ink' : 'mk-num text-base font-semibold text-ink'}>{isRange ? t('من {price}', { price: formatMoney(price) }) : formatMoney(price)}</span>
            {compareAtPrice && <span className={size === 'lg' ? 'text-base text-muted line-through' : 'text-xs text-muted line-through'}>{formatMoney(compareAtPrice)}</span>}
        </span>
    );
}

/** Small star row used on product cards. */
function CardRating({ rating, count }) {
    return (
        <span className="flex items-center gap-1 text-xs text-muted">
            <Icon name="star" className="size-3.5 fill-amber-400 text-amber-400" />
            <span className="font-semibold text-ink-2">{formatNumber(rating)}</span>
            ({formatNumber(count)})
        </span>
    );
}

/** Listing card: image (second image on hover), wishlist heart, badges, name, rating and price. */
export function ProductCard({ storeSlug, product, className }) {
    return (
        <Link to={`/${storeSlug}/p/${product.slug}`} className={cn('group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition duration-300 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-raise', className)}>
            <div className="relative aspect-[4/5] overflow-hidden bg-surface-2">
                <ProductImage src={product.image_url} alt={product.name} className={cn('transition duration-500 group-hover:scale-105', !product.in_stock && 'opacity-60 grayscale')} />
                {product.hover_image_url && product.in_stock && <img src={product.hover_image_url} alt="" loading="lazy" className="absolute inset-0 size-full object-cover opacity-0 transition duration-500 group-hover:opacity-100" />}
                <div className="absolute top-2.5 start-2.5 flex flex-col items-start gap-1.5">
                    {product.discount_percent > 0 && <span className="mk-num rounded-full bg-danger px-2 py-0.5 text-2xs font-semibold text-white shadow-sm">-{product.discount_percent}%</span>}
                </div>
                <WishlistButton storeSlug={storeSlug} productId={product.product_id} compact className="absolute top-2.5 end-2.5" />
                {!product.in_stock && <span className="absolute inset-x-3 bottom-3 rounded-lg bg-ink/80 py-1.5 text-center text-xs font-semibold text-surface backdrop-blur">{t('نفد المخزون')}</span>}
            </div>
            <div className="flex flex-1 flex-col gap-2 p-3.5">
                <span className="line-clamp-2 min-h-10 text-sm font-medium text-ink">{product.name}</span>
                {product.reviews_count > 0 && <CardRating rating={product.rating_average} count={product.reviews_count} />}
                <span className="mt-auto">
                    <PriceTag price={product.price} priceMax={product.price_max} compareAtPrice={product.compare_at_price} />
                </span>
            </div>
        </Link>
    );
}

function CardSkeleton({ className }) {
    return (
        <div className={cn('overflow-hidden rounded-2xl border border-line bg-surface', className)}>
            <Skeleton className="aspect-[4/5] w-full rounded-none" />
            <div className="flex flex-col gap-2 p-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-5 w-20" />
            </div>
        </div>
    );
}

const GRID_CLASS = 'grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5';

export function ProductGrid({ storeSlug, products, loading = false, skeletonCount = 10 }) {
    if (loading) {
        return (
            <div className={GRID_CLASS}>
                {Array.from({ length: skeletonCount }, (_, index) => (
                    <CardSkeleton key={index} />
                ))}
            </div>
        );
    }

    return (
        <div className={GRID_CLASS}>
            {products.map((product) => (
                <ProductCard key={product.product_id} storeSlug={storeSlug} product={product} />
            ))}
        </div>
    );
}

/** One swipeable row of product cards (home page sections, "you may also like"). */
export function ProductRail({ storeSlug, products, loading = false }) {
    const itemClass = 'w-[44%] shrink-0 sm:w-52 lg:w-56';

    return (
        <div className="mk-rail -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:gap-4 sm:px-0">
            {loading
                ? Array.from({ length: 6 }, (_, index) => <CardSkeleton key={index} className={itemClass} />)
                : products.map((product) => <ProductCard key={product.product_id} storeSlug={storeSlug} product={product} className={itemClass} />)}
        </div>
    );
}
