import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Display';
import { useCustomerAuth } from '@/features/storefront/CustomerAuthContext';
import { ProductGrid } from '@/features/storefront/ProductCard';
import { useStorefront } from '@/features/storefront/StorefrontLayout';
import { t } from '@/i18n';

/** Products the shopper saved for later. */
export function StoreWishlistPage() {
    const { storeSlug } = useParams();
    const { store } = useStorefront();
    const { isAuthenticated, api } = useCustomerAuth();
    const [products, setProducts] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (store) {
            document.title = `${t('المفضلة')} | ${store.name}`;
        }
    }, [store]);

    useEffect(() => {
        if (isAuthenticated) {
            api.wishlist().then(setProducts).catch((loadError) => setError(loadError.message));
        }
    }, [isAuthenticated, api]);

    if (!isAuthenticated) {
        return <Navigate to={`/${storeSlug}/account/login?next=account/wishlist`} replace />;
    }

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold text-ink">{t('المفضلة')}</h1>
            {error ? (
                <EmptyState icon="alert-triangle" title={t('تعذر تحميل المفضلة')} description={error} />
            ) : products && products.length === 0 ? (
                <EmptyState
                    icon="heart"
                    title={t('لا توجد منتجات في المفضلة')}
                    description={t('اضغط على القلب في صفحة أي منتج لحفظه هنا والرجوع له لاحقاً.')}
                    action={<Button to={`/${storeSlug}/products`}>{t('تصفح المنتجات')}</Button>}
                />
            ) : (
                <ProductGrid storeSlug={storeSlug} products={products ?? []} loading={!products} skeletonCount={4} />
            )}
        </div>
    );
}
