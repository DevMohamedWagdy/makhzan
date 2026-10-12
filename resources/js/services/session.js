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

/**
 * Token for a request scope. A vendor impersonating in this tab takes precedence over an
 * affiliate's own session.
 * @param {'vendor' | 'affiliate'} scope
 */
export function tokenFor(scope) {
    return scope === 'affiliate' ? (impersonationStore.get()?.token ?? affiliateSessionStore.get()?.token) : sessionStore.get()?.token;
}
