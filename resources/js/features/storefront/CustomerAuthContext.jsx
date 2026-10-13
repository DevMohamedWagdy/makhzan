import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { customerApi } from '@/services/customerApi';
import { customerSessionStore } from '@/services/session';

const CustomerAuthContext = createContext(null);

/** The shopper's session in the current store (accounts are per store). */
export function CustomerAuthProvider({ storeSlug, children }) {
    const store = useMemo(() => customerSessionStore(storeSlug), [storeSlug]);
    const api = useMemo(() => customerApi(storeSlug), [storeSlug]);
    const [session, setSession] = useState(() => store.get());

    useEffect(() => setSession(store.get()), [store]);

    const start = useCallback(
        ({ token, customer }, remember) => {
            store.set({ token, customer }, remember);
            setSession({ token, customer });

            return customer;
        },
        [store],
    );

    const login = useCallback(async ({ identifier, password, remember }) => start(await api.login({ identifier, password, remember }), remember), [api, start]);
    const register = useCallback(async (payload) => start(await api.register(payload), true), [api, start]);

    const clear = useCallback(() => {
        store.clear();
        setSession(null);
    }, [store]);

    const logout = useCallback(() => {
        api.logout().catch(() => {});
        clear();
    }, [api, clear]);

    // An expired or revoked token signs the shopper out of this store.
    useEffect(() => {
        const onUnauthorized = (event) => event.detail?.scope === `customer:${storeSlug}` && clear();

        window.addEventListener('makhzan:unauthorized', onUnauthorized);

        return () => window.removeEventListener('makhzan:unauthorized', onUnauthorized);
    }, [storeSlug, clear]);

    const value = useMemo(() => ({ customer: session?.customer ?? null, isAuthenticated: Boolean(session?.token), api, login, register, logout }), [session, api, login, register, logout]);

    return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
}

export function useCustomerAuth() {
    return useContext(CustomerAuthContext);
}
