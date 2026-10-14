/**
 * Browser-persisted sessions. "Remember me" uses localStorage; otherwise the session ends
 * when the browser closes (sessionStorage). Vendor and affiliate sessions are independent,
 * so both can be signed in from the same browser.
 */
function createSessionStore(key) {
    const store = {
        get() {
            try {
                // This tab's own session (e.g. an admin's "login as owner") wins over a remembered one.
                const raw = sessionStorage.getItem(key) ?? localStorage.getItem(key);

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
        /** A session for this tab only, leaving any remembered session in other tabs alone. */
        setForTab(session) {
            sessionStorage.setItem(key, JSON.stringify(session));
        },
        /** Changes the saved session in place, keeping its "remember me" choice. */
        update(patch) {
            try {
                const storage = sessionStorage.getItem(key) !== null ? sessionStorage : localStorage.getItem(key) !== null ? localStorage : null;

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
export const sessionStore = {
    ...createSessionStore('makhzan.session'),
    /** Passes a session to a tab about to open (the admin's "login as owner"); read once by takeHandoff(). */
    handoff(session) {
        localStorage.setItem('makhzan.session_handoff', JSON.stringify({ ...session, at: Date.now() }));
    },
    takeHandoff() {
        try {
            const handoff = JSON.parse(localStorage.getItem('makhzan.session_handoff'));

            localStorage.removeItem('makhzan.session_handoff');

            return handoff && Date.now() - handoff.at < 60_000 ? { token: handoff.token, vendor: handoff.vendor } : null;
        } catch {
            return null;
        }
    },
};

/** `{ token, admin }` — a platform admin's panel session; this tab only. */
export const adminSessionStore = createSessionStore('makhzan.admin_session');

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
 * @param {'vendor' | 'affiliate' | 'admin' | `customer:${string}`} scope  `customer:{store-slug}` for shoppers
 */
export function tokenFor(scope) {
    if (scope === 'admin') {
        return adminSessionStore.get()?.token;
    }

    if (scope.startsWith('customer:')) {
        return customerSessionStore(scope.slice('customer:'.length)).get()?.token;
    }

    return scope === 'affiliate' ? (impersonationStore.get()?.token ?? affiliateSessionStore.get()?.token) : sessionStore.get()?.token;
}
