import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Alert, EmptyState } from '@/components/ui/Display';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';
import { useCart } from '@/features/storefront/CartContext';
import { ProductImage } from '@/features/storefront/ProductCard';
import { useStorefront } from '@/features/storefront/StorefrontLayout';
import { t } from '@/i18n';
import { cn, formatMoney } from '@/lib/format';
import { storefrontApi } from '@/services/storefrontApi';

const STATUS_MESSAGES = {
    insufficient: (line) => t('متبقي {count} فقط، تم تعديل الكمية في الإجمالي', { count: line.available_quantity }),
    out_of_stock: () => t('نفد المخزون — احذفه للمتابعة'),
    unavailable: () => t('لم يعد متاحاً — احذفه للمتابعة'),
};

/** The cart, re-priced by the server on every change (prices and stock may have moved). */
export function StoreCartPage() {
    const { storeSlug } = useParams();
    const { store } = useStorefront();
    const { items, setQuantity, remove } = useCart();
    const toast = useToast();
    const [quote, setQuote] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (store) {
            document.title = `${t('السلة')} | ${store.name}`;
        }
    }, [store]);

    useEffect(() => {
        let cancelled = false;

        if (items.length === 0) {
            setQuote({ lines: [], subtotal: 0, items_count: 0 });

            return undefined;
        }

        setError(null);
        storefrontApi
            .quoteCart(storeSlug, items)
            .then((response) => !cancelled && setQuote(response))
            .catch((quoteError) => !cancelled && setError(quoteError.message));

        return () => {
            cancelled = true;
        };
    }, [storeSlug, items]);

    if (error) {
        return <EmptyState icon="alert-triangle" title={t('تعذر تحميل السلة')} description={error} />;
    }

    if (!quote) {
        return (
            <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
                <div className="flex flex-col gap-3">
                    {[0, 1].map((index) => (
                        <Skeleton key={index} className="h-28 w-full rounded-2xl" />
                    ))}
                </div>
                <Skeleton className="h-56 rounded-2xl" />
            </div>
        );
    }

    if (quote.lines.length === 0) {
        return (
            <EmptyState
                icon="shopping-bag"
                title={t('سلتك فارغة')}
                description={t('تصفح المنتجات وأضف ما يعجبك إلى السلة.')}
                action={
                    <Button to={`/${storeSlug}`} icon="store">
                        {t('ابدأ التسوق')}
                    </Button>
                }
            />
        );
    }

    const blocked = quote.lines.some((line) => line.status === 'out_of_stock' || line.status === 'unavailable');

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold text-ink sm:text-3xl">{t('سلة التسوق')}</h1>

            <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
                <ul className="flex flex-col gap-3">
                    {quote.lines.map((line) => (
                        <li key={line.variant_id} className={cn('flex gap-4 rounded-2xl border bg-surface p-3 sm:p-4', line.status === 'ok' ? 'border-line' : 'border-warning/40')}>
                            <Link to={line.product_slug ? `/${storeSlug}/p/${line.product_slug}` : `/${storeSlug}`} className="size-24 shrink-0 overflow-hidden rounded-xl bg-surface-2 sm:size-28">
                                <ProductImage src={line.image_url} alt={line.name ?? ''} />
                            </Link>
                            <div className="flex min-w-0 flex-1 flex-col gap-1">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate font-semibold text-ink">{line.name ?? t('منتج غير متاح')}</p>
                                        {line.variant_title && <p className="text-sm text-muted">{line.variant_title}</p>}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            remove(line.variant_id);
                                            toast.success(t('تم حذف المنتج من السلة'));
                                        }}
                                        className="grid size-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger"
                                        aria-label={t('حذف من السلة')}
                                        title={t('حذف من السلة')}
                                    >
                                        <Icon name="trash" className="size-4" />
                                    </button>
                                </div>
                                {line.status !== 'ok' && <p className="text-xs font-medium text-warning">{STATUS_MESSAGES[line.status](line)}</p>}
                                <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-2">
                                    {line.status !== 'unavailable' && line.status !== 'out_of_stock' ? (
                                        <div className="inline-flex h-9 items-center rounded-lg border border-line">
                                            <button type="button" onClick={() => setQuantity(line.variant_id, line.quantity - 1)} disabled={line.quantity <= 1} className="grid size-9 place-items-center text-ink-2 disabled:opacity-40" aria-label={t('إنقاص الكمية')}>
                                                −
                                            </button>
                                            <span className="w-8 text-center text-sm font-semibold text-ink">{line.quantity}</span>
                                            <button type="button" onClick={() => setQuantity(line.variant_id, line.quantity + 1)} disabled={line.quantity >= line.available_quantity} className="grid size-9 place-items-center text-ink-2 disabled:opacity-40" aria-label={t('زيادة الكمية')}>
                                                +
                                            </button>
                                        </div>
                                    ) : (
                                        <span />
                                    )}
                                    {line.unit_price !== undefined && (
                                        <div className="text-end">
                                            <p className="font-bold text-ink">{formatMoney(line.line_total)}</p>
                                            <p className="text-xs text-muted">{t('{price} للقطعة', { price: formatMoney(line.unit_price) })}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>

                <aside className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 lg:sticky lg:top-36">
                    <h2 className="text-lg font-semibold text-ink">{t('ملخص الطلب')}</h2>
                    <dl className="flex flex-col gap-2.5 text-sm">
                        <div className="flex justify-between">
                            <dt className="text-muted">{t('المنتجات ({count})', { count: quote.items_count })}</dt>
                            <dd className="font-medium text-ink">{formatMoney(quote.subtotal)}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-muted">{t('الشحن')}</dt>
                            <dd className="text-ink-2">{t('يُحسب حسب المحافظة')}</dd>
                        </div>
                        <div className="mt-1 flex justify-between border-t border-line pt-3 text-base">
                            <dt className="font-semibold text-ink">{t('الإجمالي')}</dt>
                            <dd className="font-bold text-ink">{formatMoney(quote.subtotal)}</dd>
                        </div>
                    </dl>
                    {blocked && <Alert tone="warning">{t('بعض المنتجات لم تعد متاحة، احذفها لإتمام الطلب.')}</Alert>}
                    <Button size="lg" icon="check" disabled={blocked} onClick={() => toast.info(t('إتمام الطلب قريباً'), t('نجهّز صفحة إتمام الطلب والدفع عند الاستلام.'))}>
                        {t('إتمام الطلب')}
                    </Button>
                    <Link to={`/${storeSlug}`} className="text-center text-sm font-medium text-primary hover:underline">
                        {t('متابعة التسوق')}
                    </Link>
                </aside>
            </div>
        </div>
    );
}
