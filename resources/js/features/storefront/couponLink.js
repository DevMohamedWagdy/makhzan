const KEEP_DAYS = 7;
const storageKey = (storeSlug) => `makhzan.coupon.${storeSlug}`;

/**
 * Remembers the discount code from a coupon link (?coupon=CODE) for 7 days, so checkout
 * applies it automatically. The order checks it like a typed code.
 */
export function captureCoupon(storeSlug, code) {
    const normalized = String(code ?? '').replace(/\s+/g, '').toUpperCase();

    if (!normalized) {
        return null;
    }

    try {
        localStorage.setItem(storageKey(storeSlug), JSON.stringify({ code: normalized, at: Date.now() }));
    } catch {
        // Storage blocked: the shopper can still type the code.
    }

    return normalized;
}

/** The code from a coupon link opened in the last 7 days, if any. */
export function getSavedCoupon(storeSlug) {
    try {
        const saved = JSON.parse(localStorage.getItem(storageKey(storeSlug)) ?? 'null');

        return saved && Date.now() - saved.at < KEEP_DAYS * 86400000 ? saved.code : null;
    } catch {
        return null;
    }
}

/** Forgets the saved code (used, removed by the shopper, or no longer valid). */
export function clearSavedCoupon(storeSlug) {
    try {
        localStorage.removeItem(storageKey(storeSlug));
    } catch {
        // Nothing to clear.
    }
}
