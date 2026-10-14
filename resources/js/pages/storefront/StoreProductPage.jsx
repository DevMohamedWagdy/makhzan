import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Display';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';
import { useCart } from '@/features/storefront/CartContext';
import { Stars } from '@/features/reviews/Stars';
import { ProductReviews } from '@/features/reviews/ProductReviews';
import { PriceTag, ProductGrid, ProductImage } from '@/features/storefront/ProductCard';
import { useStorefront } from '@/features/storefront/StorefrontLayout';
import { trackEvent } from '@/features/storefront/tracking';
import { WishlistButton } from '@/features/storefront/WishlistButton';
import { t } from '@/i18n';
import { cn, formatNumber } from '@/lib/format';
import { storefrontApi } from '@/services/storefrontApi';

const MAX_PER_ORDER = 10;

const sameValues = (a, b) => a.length === b.length && a.every((value, index) => value === b[index]);

function Gallery({ images, name }) {
    const [active, setActive] = useState(0);
    const current = images[active]?.url;

    return (
        <div className="flex flex-col gap-3">
            <div className="aspect-[4/5] overflow-hidden rounded-3xl border border-line bg-surface-2">
                <ProductImage src={current} alt={name} />
            </div>
            {images.length > 1 && (
                <div className="grid grid-cols-5 gap-2">
                    {images.map((image, index) => (
                        <button
                            key={image.url}
                            type="button"
                            onClick={() => setActive(index)}
                            className={cn('aspect-square overflow-hidden rounded-xl border-2 transition', index === active ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100')}
                            aria-label={t('صورة {number}', { number: index + 1 })}
                            aria-current={index === active}
                        >
                            <ProductImage src={image.url} alt="" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function QuantityStepper({ value, max, onChange }) {
    return (
        <div className="inline-flex h-12 items-center rounded-xl border border-line bg-surface">
            <button type="button" onClick={() => onChange(Math.max(1, value - 1))} disabled={value <= 1} className="grid size-12 place-items-center text-ink-2 hover:text-ink disabled:opacity-40" aria-label={t('إنقاص الكمية')}>
                <span className="text-xl leading-none">−</span>
            </button>
            <span className="w-10 text-center font-semibold text-ink" aria-live="polite">
                {value}
            </span>
            <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="grid size-12 place-items-center text-ink-2 hover:text-ink disabled:opacity-40" aria-label={t('زيادة الكمية')}>
                <span className="text-xl leading-none">+</span>
            </button>
        </div>
    );
}

/** Product page: gallery, option pickers with per-combination availability, add to cart. */
export function StoreProductPage() {
    const { storeSlug, productSlug } = useParams();
    const { store } = useStorefront();
    const { add } = useCart();
    const toast = useToast();
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [selected, setSelected] = useState([]);
    const [quantity, setQuantity] = useState(1);
    const [justAdded, setJustAdded] = useState(false);

    useEffect(() => {
        let cancelled = false;

        setData(null);
        setError(null);
        setJustAdded(false);
        storefrontApi
            .product(storeSlug, productSlug)
            .then((response) => {
                if (cancelled) {
                    return;
                }

                const firstAvailable = response.product.variants.find((variant) => variant.available) ?? response.product.variants[0];

                setData(response);
                setSelected(firstAvailable?.option_values ?? []);
                setQuantity(1);
            })
            .catch((loadError) => !cancelled && setError(loadError));

        return () => {
            cancelled = true;
        };
    }, [storeSlug, productSlug]);

    const product = data?.product;

    useEffect(() => {
        if (product && store) {
            document.title = `${product.name} | ${store.name}`;
        }
    }, [product, store]);

    useEffect(() => {
        if (product) {
            trackEvent('view_item', { value: product.price, items: [{ id: product.product_id, name: product.name, price: product.price, quantity: 1 }] });
        }
    }, [product]);

    const variant = useMemo(() => product?.variants.find((candidate) => sameValues(candidate.option_values, selected)) ?? null, [product, selected]);

    /** A value is available when some in-stock variant has it together with the other current choices. */
    const isValueAvailable = (optionIndex, value) =>
        product.variants.some((candidate) => candidate.available && candidate.option_values[optionIndex] === value && candidate.option_values.every((other, index) => index === optionIndex || other === selected[index]));

    const maxQuantity = Math.min(MAX_PER_ORDER, variant?.stock_left ?? MAX_PER_ORDER);

    const addToCart = () => {
        add(variant.variant_id, quantity);
        setJustAdded(true);
        trackEvent('add_to_cart', { value: variant.price * quantity, items: [{ id: product.product_id, name: product.name, price: variant.price, quantity }] });
        toast.success(t('تمت الإضافة إلى السلة'), selected.length ? `${product.name} — ${selected.join(' / ')}` : product.name);
    };

    if (error) {
        return (
            <EmptyState
                icon="search"
                title={t('المنتج غير متاح')}
                description={t('ربما تم بيعه بالكامل أو إزالته من المتجر.')}
                action={
                    <Button variant="secondary" to={`/${storeSlug}`}>
                        {t('العودة للمتجر')}
                    </Button>
                }
            />
        );
    }

    if (!product) {
        return (
            <div className="grid gap-8 lg:grid-cols-2">
                <Skeleton className="aspect-[4/5] w-full rounded-3xl" />
                <div className="flex flex-col gap-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-9 w-3/4" />
                    <Skeleton className="h-7 w-32" />
                    <Skeleton className="h-24 w-full" />
                </div>
            </div>
        );
    }

    const price = variant?.price ?? product.price;
    const compareAtPrice = variant ? variant.compare_at_price : product.compare_at_price;

    return (
        <div className="flex flex-col gap-14">
            <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-12">
                <Gallery key={product.product_id} images={product.images} name={product.name} />

                <div className="flex flex-col gap-6 lg:sticky lg:top-36">
                    <div>
                        <nav aria-label={t('مسار التنقل')} className="flex items-center gap-1.5 text-sm text-muted">
                            <Link to={`/${storeSlug}`} className="hover:text-primary">
                                {t('الرئيسية')}
                            </Link>
                            <Icon name="chevron-left" className="size-3.5" />
                            <Link to={`/${storeSlug}/c/${product.category.slug}`} className="hover:text-primary">
                                {product.category.name}
                            </Link>
                        </nav>
                        <h1 className="mt-3 text-2xl leading-snug font-bold text-ink sm:text-3xl">{product.name}</h1>
                        {product.reviews_count > 0 && (
                            <a href="#reviews" className="mt-2 inline-flex items-center gap-2 text-sm text-muted hover:text-primary">
                                <Stars rating={product.rating_average} />
                                {t('{rating} ({count} تقييم)', { rating: formatNumber(product.rating_average), count: formatNumber(product.reviews_count) })}
                            </a>
                        )}
                        <div className="mt-4 flex items-center gap-3">
                            <PriceTag price={price} compareAtPrice={compareAtPrice} size="lg" />
                            {compareAtPrice > price && <span className="rounded-full bg-danger-soft px-2.5 py-1 text-xs font-bold text-danger">{t('وفّر {amount}%', { amount: Math.round((1 - price / compareAtPrice) * 100) })}</span>}
                        </div>
                    </div>

                    {product.options.map((option, optionIndex) => (
                        <div key={option.name}>
                            <p className="mb-2.5 text-sm font-semibold text-ink">
                                {option.name}: <span className="font-normal text-ink-2">{selected[optionIndex]}</span>
                            </p>
                            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={option.name}>
                                {option.values.map((value) => {
                                    const isSelected = selected[optionIndex] === value;
                                    const available = isValueAvailable(optionIndex, value);

                                    return (
                                        <button
                                            key={value}
                                            type="button"
                                            role="radio"
                                            aria-checked={isSelected}
                                            onClick={() => {
                                                setSelected((current) => current.map((item, index) => (index === optionIndex ? value : item)));
                                                setQuantity(1);
                                                setJustAdded(false);
                                            }}
                                            className={cn(
                                                'min-w-12 rounded-xl border px-4 py-2.5 text-sm font-medium transition',
                                                isSelected ? 'border-primary bg-primary-soft text-primary ring-4 ring-primary/10' : 'border-line bg-surface text-ink hover:border-line-strong',
                                                !available && 'text-muted line-through decoration-1',
                                            )}
                                        >
                                            {value}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    <div className="text-sm">
                        {!variant || !variant.available ? (
                            <span className="font-semibold text-danger">{t('نفد المخزون لهذا الاختيار')}</span>
                        ) : variant.stock_left ? (
                            <span className="font-semibold text-warning">{t('باقي {count} قطع فقط — اطلب الآن', { count: variant.stock_left })}</span>
                        ) : (
                            <span className="flex items-center gap-1.5 font-medium text-success">
                                <Icon name="check-circle" className="size-4" />
                                {t('متوفر')}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <QuantityStepper value={quantity} max={maxQuantity} onChange={setQuantity} />
                        <Button size="lg" icon="shopping-bag" className="flex-1" disabled={!variant?.available} onClick={addToCart}>
                            {t('أضف إلى السلة')}
                        </Button>
                        <WishlistButton storeSlug={storeSlug} productId={product.product_id} />
                    </div>
                    {justAdded && (
                        <Link to={`/${storeSlug}/cart`} className="animate-pop -mt-2 flex items-center justify-center gap-2 rounded-xl bg-success-soft px-4 py-3 text-sm font-semibold text-success">
                            <Icon name="check-circle" className="size-4" />
                            {t('تمت الإضافة — عرض السلة وإتمام الطلب')}
                        </Link>
                    )}

                    {store?.loyalty && price > 0 && (
                        <p className="flex items-center gap-2 rounded-xl bg-warning-soft px-4 py-3 text-sm text-ink-2">
                            <Icon name="star" className="size-4 shrink-0 fill-amber-400 text-amber-400" />
                            {t('اكسب {points} نقطة مع هذا المنتج بعد استلامه', { points: Math.floor((price * quantity * store.loyalty.earn_rate) / 100) })}
                        </p>
                    )}

                    <ul className="grid gap-3 rounded-2xl border border-line bg-surface p-4 text-sm text-ink-2 sm:grid-cols-2">
                        <li className="flex items-center gap-2">
                            <Icon name="wallet" className="size-[18px] text-primary" />
                            {t('الدفع عند الاستلام')}
                        </li>
                        <li className="flex items-center gap-2">
                            <Icon name="truck" className="size-[18px] text-primary" />
                            {t('شحن لكل المحافظات')}
                        </li>
                    </ul>

                    {product.description && (
                        <div>
                            <h2 className="mb-2 text-base font-semibold text-ink">{t('تفاصيل المنتج')}</h2>
                            <p className="text-sm leading-loose whitespace-pre-line text-ink-2">{product.description}</p>
                        </div>
                    )}
                </div>
            </div>

            <ProductReviews storeSlug={storeSlug} productSlug={product.slug} storeName={store?.name} />

            {data.related.length > 0 && (
                <section>
                    <h2 className="mb-4 text-xl font-bold text-ink">{t('قد يعجبك أيضاً')}</h2>
                    <ProductGrid storeSlug={storeSlug} products={data.related} />
                </section>
            )}
        </div>
    );
}
