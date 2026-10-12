import { useCallback, useEffect, useState } from 'react';
import { affiliatePortalApi } from '@/services/affiliatePortalApi';

const POLL_INTERVAL = 60_000;

/**
 * The affiliate's bell: latest notifications and unread count, polled every minute and on
 * window focus. A vendor impersonating sees them but `readOnly` keeps them unread.
 */
export function useAffiliateNotifications({ readOnly = false } = {}) {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const refresh = useCallback(async () => {
        try {
            const list = await affiliatePortalApi.notifications({ per_page: 8 });

            setNotifications(list.data);
            setUnreadCount(list.summary.unread_count);
        } catch {
            // Best-effort; the next poll retries.
        }
    }, []);

    useEffect(() => {
        refresh();

        const timer = setInterval(refresh, POLL_INTERVAL);

        window.addEventListener('focus', refresh);

        return () => {
            clearInterval(timer);
            window.removeEventListener('focus', refresh);
        };
    }, [refresh]);

    const markRead = useCallback(
        async (notification) => {
            if (!readOnly && !notification.read_at) {
                await affiliatePortalApi.markNotificationRead(notification.id).catch(() => {});
                refresh();
            }
        },
        [readOnly, refresh],
    );

    const markAllRead = useCallback(async () => {
        await affiliatePortalApi.markAllNotificationsRead();
        refresh();
    }, [refresh]);

    return { notifications, unreadCount, refresh, markRead, markAllRead: readOnly ? null : markAllRead };
}
