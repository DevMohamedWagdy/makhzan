import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '@/services/authApi';
import { affiliatePortalApi } from '@/services/affiliatePortalApi';
import { affiliatesApi } from '@/services/affiliatesApi';
import { impersonationStore, sessionStore } from '@/services/session';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [session, setSession] = useState(() => sessionStore.get());
    const [impersonation, setImpersonation] = useState(() => impersonationStore.get());

    const persist = useCallback((nextSession, remember) => {
        sessionStore.set(nextSession, remember);
        setSession(nextSession);
    }, []);

    const login = useCallback(
        async ({ identifier, password, remember }) => {
            const { token, vendor } = await authApi.login({ identifier, password, remember });

            persist({ token, vendor }, remember);

            return vendor;
        },
        [persist],
    );

    const register = useCallback(
        async (payload) => {
            const { token, vendor } = await authApi.register(payload);

            persist({ token, vendor }, true);

            return vendor;
        },
        [persist],
    );

    const stopImpersonating = useCallback(() => {
        // Revoke the short-lived affiliate token now rather than leaving it valid until expiry.
        if (impersonationStore.get()) {
            affiliatePortalApi.logout().catch(() => {});
        }

        impersonationStore.clear();
        setImpersonation(null);
    }, []);

    const clearSession = useCallback(() => {
        sessionStore.clear();
        stopImpersonating();
        setSession(null);
    }, [stopImpersonating]);

    const logout = useCallback(() => {
        // Revoke the token server-side; the local session is cleared regardless of the outcome.
        authApi.logout().catch(() => {});
        clearSession();
    }, [clearSession]);

    useEffect(() => {
        const onUnauthorized = (event) => event.detail?.scope === 'vendor' && clearSession();

        window.addEventListener('makhzan:unauthorized', onUnauthorized);

        return () => window.removeEventListener('makhzan:unauthorized', onUnauthorized);
    }, [clearSession]);

    /** Starts a time-limited "login as affiliate" session; vendor session stays intact. */
    const impersonate = useCallback(async (affiliateId) => {
        const result = await affiliatesApi.impersonate(affiliateId);

        impersonationStore.set(result);
        setImpersonation(result);

        return result;
    }, []);

    const value = useMemo(
        () => ({
            vendor: session?.vendor ?? null,
            store: session?.vendor?.store ?? null,
            isAuthenticated: Boolean(session?.token),
            impersonation,
            login,
            register,
            logout,
            impersonate,
            stopImpersonating,
        }),
        [session, impersonation, login, register, logout, impersonate, stopImpersonating],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }

    return context;
}
