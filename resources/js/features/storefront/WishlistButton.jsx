import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/context/ToastContext';
import { t } from '@/i18n';
import { cn } from '@/lib/format';
import { useCustomerAuth } from './CustomerAuthContext';

/** Saved product IDs per store for this page session, loaded once and shared by every heart. */
const savedIds = new Map();

function loadSaved(storeSlug, api) {
    if (!savedIds.has(storeSlug)) {
        savedIds.set(
            storeSlug,
            api
                .wishlist()
                .then((products) => new Set(products.map((product) => product.product_id)))
                .catch(() => new Set()),
        );
    }

    return savedIds.get(storeSlug);
}

/** Heart toggle that saves a product to the shopper's wishlist (signing in first if needed). */
export function WishlistButton({ storeSlug, productId, className }) {
    const { isAuthenticated, api } = useCustomerAuth();
    const navigate = useNavigate();
    const toast = useToast();
    const [saved, setSaved] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) {
            savedIds.delete(storeSlug);
            setSaved(false);

            return undefined;
        }

        let cancelled = false;
        loadSaved(storeSlug, api).then((ids) => !cancelled && setSaved(ids.has(productId)));

        return () => {
            cancelled = true;
        };
    }, [isAuthenticated, api, storeSlug, productId]);

    const toggle = async (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (!isAuthenticated) {
            navigate(`/${storeSlug}/account/login?next=${encodeURIComponent(window.location.pathname.replace(`/${storeSlug}/`, ''))}`);

            return;
        }

        setBusy(true);

        try {
            const ids = await loadSaved(storeSlug, api);

            if (saved) {
                await api.removeFromWishlist(productId);
                ids.delete(productId);
            } else {
                await api.addToWishlist(productId);
                ids.add(productId);
                toast.success(t('أُضيف إلى المفضلة'));
            }

            setSaved(!saved);
        } catch (error) {
            toast.error(t('تعذر تحديث المفضلة'), error.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <button
            type="button"
            onClick={toggle}
            disabled={busy}
            aria-pressed={saved}
            aria-label={saved ? t('إزالة من المفضلة') : t('أضف إلى المفضلة')}
            title={saved ? t('إزالة من المفضلة') : t('أضف إلى المفضلة')}
            className={cn('grid size-12 shrink-0 place-items-center rounded-xl border border-line bg-surface transition hover:border-line-strong disabled:opacity-60', saved ? 'text-danger' : 'text-ink-2 hover:text-danger', className)}
        >
            <Icon name="heart" className={cn('size-5', saved && 'fill-current')} />
        </button>
    );
}
