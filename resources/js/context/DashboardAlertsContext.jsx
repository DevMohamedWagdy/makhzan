import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { affiliatesApi } from '@/services/affiliatesApi';
import { notificationsApi } from '@/services/notificationsApi';

const DashboardAlertsContext = createContext(null);

const REFRESH_EVENT = 'makhzan:alerts-refresh';
const POLL_INTERVAL = 60_000;

/** Asks the bell and sidebar counters to reload, e.g. after a payout is recorded. */
export const refreshDashboardAlerts = () => window.dispatchEvent(new Event(REFRESH_EVENT));

/**
 * Vendor-wide counters: the bell's latest notifications and unread count, and the open
 * transfer requests shown in the sidebar. Polled every minute and on window focus.
 */
export function DashboardAlertsProvider({ children }) {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [payoutRequestsCount, setPayoutRequestsCount] = useState(0);

    const refresh = useCallback(async () => {
        try {
            const [list, summary] = await Promise.all([notificationsApi.list({ per_page: 8 }), affiliatesApi.summary()]);

            setNotifications(list.data);
            setUnreadCount(list.summary.unread_count);
            setPayoutRequestsCount(summary.payout_requests);
        } catch {
            // Counters are best-effort; the next poll retries.
        }
    }, []);

    useEffect(() => {
        refresh();

        const timer = setInterval(refresh, POLL_INTERVAL);

        window.addEventListener(REFRESH_EVENT, refresh);
        window.addEventListener('focus', refresh);

        return () => {
            clearInterval(timer);
            window.removeEventListener(REFRESH_EVENT, refresh);
            window.removeEventListener('focus', refresh);
        };
    }, [refresh]);

    const markRead = useCallback(
        async (notification) => {
            if (!notification.read_at) {
                await notificationsApi.markRead(notification.id).catch(() => {});
                refresh();
            }
        },
        [refresh],
    );

    const markAllRead = useCallback(async () => {
        await notificationsApi.markAllRead();
        refresh();
    }, [refresh]);

    const value = useMemo(
        () => ({ notifications, unreadCount, payoutRequestsCount, refresh, markRead, markAllRead }),
        [notifications, unreadCount, payoutRequestsCount, refresh, markRead, markAllRead],
    );

    return <DashboardAlertsContext.Provider value={value}>{children}</DashboardAlertsContext.Provider>;
}

export function useDashboardAlerts() {
    return useContext(DashboardAlertsContext);
}
