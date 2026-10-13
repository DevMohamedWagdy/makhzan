/**
 * Browser-persisted sessions. "Remember me" uses localStorage; otherwise the session ends
 * when the browser closes (sessionStorage). Vendor and affiliate sessions are independent,
 * so both can be signed in from the same browser.
 */
function createSessionStore(key) {
    const store = {
        get() {
            try {
                const raw = localStorage.getItem(key) ?? sessionStorage.getItem(key);

                return raw ? JSON.parse(raw) : null;
            } catch {
                return null;
            }
        },
        set(session, remember) {
            store.clear();
            (remember ? localStorage : sessionStorage).setItem(key, JSON.stringify(session));
        },
        clear() {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        },
        /** Changes the saved session in place, keeping its "remember me" choice. */
        update(patch) {
            try {
                const storage = localStorage.getItem(key) !== null ? localStorage : sessionStorage.getItem(key) !== null ? sessionStorage : null;

                if (storage) {
                    storage.setItem(key, JSON.stringify({ ...JSON.parse(storage.getItem(key)), ...patch }));
                }
            } catch {
                // Storage unavailable: the in-memory session still updates.
            }
        },
    };

    return store;
}

/** `{ token, vendor }` */
export const sessionStore = createSessionStore('makhzan.session');

/** `{ token, affiliate }` — the affiliate's own portal session. */
export const affiliateSessionStore = createSessionStore('makhzan.affiliate_session');

/** `{ token, expires_at, affiliate }` — a vendor's "login as affiliate" session; this tab only. */
export const impersonationStore = {
    get() {
        try {
            return JSON.parse(sessionStorage.getItem('makhzan.impersonation')) ?? null;
        } catch {
            return null;
        }
    },
    set(value) {
        sessionStorage.setItem('makhzan.impersonation', JSON.stringify(value));
    },
    clear() {
        sessionStorage.removeItem('makhzan.impersonation');
    },
};

/** Last store an affiliate signed in to, so a bare /affiliate visit can send them back to its login page. */
export const lastAffiliateStore = {
    get: () => localStorage.getItem('makhzan.affiliate_store'),
    set: (slug) => localStorage.setItem('makhzan.affiliate_store', slug),
};

/** `{ token, customer }` — a shopper's account session in one store (accounts are per store). */
export function customerSessionStore(storeSlug) {
    return createSessionStore(`makhzan.customer.${storeSlug}`);
}

/**
 * Token for a request scope. A vendor impersonating in this tab takes precedence over an
 * affiliate's own session.
 * @param {'vendor' | 'affiliate' | `customer:${string}`} scope  `customer:{store-slug}` for shoppers
 */
export function tokenFor(scope) {
    if (scope.startsWith('customer:')) {
        return customerSessionStore(scope.slice('customer:'.length)).get()?.token;
    }

    return scope === 'affiliate' ? (impersonationStore.get()?.token ?? affiliateSessionStore.get()?.token) : sessionStore.get()?.token;
}
