import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { adminApi } from '@/services/adminApi';
import { adminSessionStore } from '@/services/session';

const AdminAuthContext = createContext(null);

/** The platform admin's session, independent of any vendor or affiliate session. */
export function AdminAuthProvider({ children }) {
    const [session, setSession] = useState(() => adminSessionStore.get());

    const login = useCallback(async ({ email, password }) => {
        const { token, admin } = await adminApi.login({ email, password });

        adminSessionStore.set({ token, admin }, false);
        setSession({ token, admin });

        return admin;
    }, []);

    const clearSession = useCallback(() => {
        adminSessionStore.clear();
        setSession(null);
    }, []);

    const logout = useCallback(() => {
        adminApi.logout().catch(() => {});
        clearSession();
    }, [clearSession]);

    useEffect(() => {
        const onUnauthorized = (event) => event.detail?.scope === 'admin' && clearSession();

        window.addEventListener('makhzan:unauthorized', onUnauthorized);

        return () => window.removeEventListener('makhzan:unauthorized', onUnauthorized);
    }, [clearSession]);

    /** Permissions change when the team manager edits a role: refresh them. */
    const refresh = useCallback(async () => {
        const admin = await adminApi.me();

        setSession((current) => {
            if (!current) {
                return current;
            }

            adminSessionStore.update({ admin });

            return { ...current, admin };
        });
    }, []);

    const value = useMemo(() => {
        const admin = session?.admin ?? null;
        const granted = new Set(admin?.permissions ?? []);

        return {
            admin,
            isAuthenticated: Boolean(session?.token),
            login,
            logout,
            refresh,
            /** A "section.action" permission; super admins (and old sessions) hold all. */
            can: (permission) => !admin || admin.is_super !== false || granted.has(permission),
        };
    }, [session, login, logout, refresh]);

    return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
    const context = useContext(AdminAuthContext);

    if (!context) {
        throw new Error('useAdminAuth must be used within AdminAuthProvider');
    }

    return context;
}
