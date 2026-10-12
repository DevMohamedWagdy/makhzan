import { storefrontApi } from '@/services/storefrontApi';

const ATTRIBUTION_DAYS = 30;
const storageKey = (storeSlug) => `makhzan.ref.${storeSlug}`;

/**
 * Remembers the affiliate code from a referral link (?ref=CODE) for 30 days, so a later
 * order is credited to that affiliate (last click wins). Each code is counted as a click
 * once per browser session.
 */
export function captureReferral(storeSlug, code) {
    const normalized = String(code ?? '').trim().toUpperCase();

    if (!normalized) {
        return;
    }

    try {
        localStorage.setItem(storageKey(storeSlug), JSON.stringify({ code: normalized, at: Date.now() }));

        const clickedKey = `${storageKey(storeSlug)}.clicked.${normalized}`;

        if (!sessionStorage.getItem(clickedKey)) {
            sessionStorage.setItem(clickedKey, '1');
            storefrontApi.recordReferralClick(storeSlug, normalized).catch(() => {});
        }
    } catch {
        // Storage blocked: the visit simply isn't attributed.
    }
}

/** The affiliate code to credit an order with, if a referral link was used in the last 30 days. */
export function getReferralCode(storeSlug) {
    try {
        const saved = JSON.parse(localStorage.getItem(storageKey(storeSlug)) ?? 'null');

        return saved && Date.now() - saved.at < ATTRIBUTION_DAYS * 86400000 ? saved.code : null;
    } catch {
        return null;
    }
}
