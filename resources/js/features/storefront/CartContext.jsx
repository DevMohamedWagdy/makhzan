import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);
const MAX_QUANTITY = 99;

const storageKey = (storeSlug) => `makhzan.cart.${storeSlug}`;

function readCart(storeSlug) {
    try {
        const items = JSON.parse(localStorage.getItem(storageKey(storeSlug)) ?? '[]');

        return Array.isArray(items) ? items.filter((item) => Number.isInteger(item.variant_id) && item.quantity > 0) : [];
    } catch {
        return [];
    }
}

/**
 * The shopper's cart for one store, kept in localStorage as [{ variant_id, quantity }].
 * Prices and stock are always re-checked with the server (storefrontApi.quoteCart).
 */
export function CartProvider({ storeSlug, children }) {
    const [items, setItems] = useState(() => readCart(storeSlug));

    useEffect(() => {
        setItems(readCart(storeSlug));
    }, [storeSlug]);

    // Keep tabs of the same store in sync.
    useEffect(() => {
        const onStorage = (event) => event.key === storageKey(storeSlug) && setItems(readCart(storeSlug));

        window.addEventListener('storage', onStorage);

        return () => window.removeEventListener('storage', onStorage);
    }, [storeSlug]);

    const save = useCallback(
        (updater) =>
            setItems((current) => {
                const next = updater(current).filter((item) => item.quantity > 0);

                try {
                    localStorage.setItem(storageKey(storeSlug), JSON.stringify(next));
                } catch {
                    // Storage full or blocked: the cart lives for this page only.
                }

                return next;
            }),
        [storeSlug],
    );

    const add = useCallback(
        (variantId, quantity = 1) =>
            save((current) =>
                current.some((item) => item.variant_id === variantId)
                    ? current.map((item) => (item.variant_id === variantId ? { ...item, quantity: Math.min(item.quantity + quantity, MAX_QUANTITY) } : item))
                    : [...current, { variant_id: variantId, quantity: Math.min(quantity, MAX_QUANTITY) }],
            ),
        [save],
    );

    const setQuantity = useCallback((variantId, quantity) => save((current) => current.map((item) => (item.variant_id === variantId ? { ...item, quantity: Math.min(quantity, MAX_QUANTITY) } : item))), [save]);
    const remove = useCallback((variantId) => save((current) => current.filter((item) => item.variant_id !== variantId)), [save]);
    const clear = useCallback(() => save(() => []), [save]);

    const value = useMemo(
        () => ({ items, count: items.reduce((sum, item) => sum + item.quantity, 0), add, setQuantity, remove, clear }),
        [items, add, setQuantity, remove, clear],
    );

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
    return useContext(CartContext);
}
