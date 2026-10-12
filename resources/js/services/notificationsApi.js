import { request } from './client';

const BASE = '/api/v1/vendor/notifications';

/** Vendor dashboard notifications (new affiliate sign-ups, payout requests). */
export const notificationsApi = {
    /** @param {{ unread?: 1, page?: number, per_page?: 8 | 20 }} query  Returns `{ data, meta, summary: { unread_count } }`. */
    list: (query = {}) => request('GET', BASE, { query }),
    markRead: (notificationId) => request('POST', `${BASE}/${notificationId}/read`),
    markAllRead: () => request('POST', `${BASE}/read-all`),
};
