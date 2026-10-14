import { useEffect } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { sessionStore } from '@/services/session';

/**
 * /impersonate — opened by the admin panel's "login as owner": takes the handed-off session
 * for this tab only and loads the dashboard with it.
 */
export function ImpersonatePage() {
    useEffect(() => {
        const session = sessionStore.takeHandoff();

        if (session) {
            sessionStore.setForTab(session);
        }

        window.location.replace(session ? '/dashboard' : '/login');
    }, []);

    return (
        <div className="grid min-h-dvh place-items-center">
            <Spinner />
        </div>
    );
}
