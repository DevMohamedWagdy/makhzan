import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { affiliatePortalApi } from '@/services/affiliatePortalApi';
import { affiliateSessionStore, lastAffiliateStore } from '@/services/session';

const AffiliateAuthContext = createContext(null);

/**
 * Affiliate portal session. A vendor's impersonation session (from AuthContext) counts as
 * signed in too, read-only, and takes precedence in the tab where it was started.
 */
export function AffiliateAuthProvider({ children }) {
    const { impersonation, stopImpersonating } = useAuth();
    const [session, setSession] = useState(() => affiliateSessionStore.get());

    const login = useCallback(async ({ storeSlug, identifier, password, remember }) => {
        const { token, affiliate } = await affiliatePortalApi.login({ store_slug: storeSlug, identifier, password, remember });

        affiliateSessionStore.set({ token, affiliate }, remember);
        lastAffiliateStore.set(storeSlug);
        setSession({ token, affiliate });

        return affiliate;
    }, []);

    const clearSession = useCallback(() => {
        affiliateSessionStore.clear();
        setSession(null);
    }, []);

    const logout = useCallback(() => {
        affiliatePortalApi.logout().catch(() => {});
        clearSession();
    }, [clearSession]);

    useEffect(() => {
        const onUnauthorized = (event) => {
            if (event.detail?.scope !== 'affiliate') {
                return;
            }

            // An expired impersonation token ends impersonation, not the affiliate's own session.
            if (impersonation) {
                stopImpersonating();
            } else {
                clearSession();
            }
        };

        window.addEventListener('makhzan:unauthorized', onUnauthorized);

        return () => window.removeEventListener('makhzan:unauthorized', onUnauthorized);
    }, [impersonation, stopImpersonating, clearSession]);

    const value = useMemo(
        () => ({
            isAuthenticated: Boolean(impersonation?.token || session?.token),
            isImpersonating: Boolean(impersonation?.token),
            storeSlug: impersonation?.affiliate?.store?.slug ?? session?.affiliate?.store?.slug ?? lastAffiliateStore.get(),
            login,
            logout,
        }),
        [impersonation, session, login, logout],
    );

    return <AffiliateAuthContext.Provider value={value}>{children}</AffiliateAuthContext.Provider>;
}

export function useAffiliateAuth() {
    const context = useContext(AffiliateAuthContext);

    if (!context) {
        throw new Error('useAffiliateAuth must be used within AffiliateAuthProvider');
    }

    return context;
}
