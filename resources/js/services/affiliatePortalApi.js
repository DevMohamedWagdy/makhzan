import { request } from './client';

/** Affiliate portal endpoints. Authenticated calls use the affiliate (or impersonation) token. */
export const affiliatePortalApi = {
    /** Public store identity for store-branded pages. */
    getStore: (slug) => request('GET', `/api/v1/stores/${encodeURIComponent(slug)}`),

    /** @param {{ store_slug: string, identifier: string, password: string, remember: boolean }} payload */
    login: (payload) => request('POST', '/api/v1/affiliate/auth/login', { body: payload }),

    /** @param {{ store_slug: string, identifier: string }} payload */
    forgotPassword: (payload) => request('POST', '/api/v1/affiliate/auth/forgot-password', { body: payload }),

    /** @param {{ store_slug: string, affiliate_id: number, token: string, password: string, password_confirmation: string }} payload */
    resetPassword: (payload) => request('POST', '/api/v1/affiliate/auth/reset-password', { body: payload }),

    me: () => request('GET', '/api/v1/affiliate/auth/me', { auth: 'affiliate' }),

    logout: () => request('POST', '/api/v1/affiliate/auth/logout', { auth: 'affiliate' }),

    /**
     * Orders from the affiliate's links: `{ data, meta, summary: { expected_commission, expected_orders } }`
     * @param {number} page
     * @param {'pending'|'earned'|'cancelled'} [commissionStatus]
     */
    orders: (page = 1, commissionStatus) => request('GET', '/api/v1/affiliate/orders', { query: { page, commission_status: commissionStatus }, auth: 'affiliate' }),

    /** Own payouts and transfer requests, newest first: { data, meta, summary: { total_paid } }. */
    payouts: (page = 1) => request('GET', '/api/v1/affiliate/payouts', { query: { page }, auth: 'affiliate' }),

    /** Asks the vendor to transfer commission. @param {{ amount: number, note?: string }} payload */
    requestPayout: (payload) => request('POST', '/api/v1/affiliate/payouts', { body: payload, auth: 'affiliate' }),

    /** @param {{ unread?: 1, page?: number, per_page?: 8 | 20 }} query  Returns `{ data, meta, summary: { unread_count } }`. */
    notifications: (query = {}) => request('GET', '/api/v1/affiliate/notifications', { query, auth: 'affiliate' }),
    markNotificationRead: (notificationId) => request('POST', `/api/v1/affiliate/notifications/${notificationId}/read`, { auth: 'affiliate' }),
    markAllNotificationsRead: () => request('POST', '/api/v1/affiliate/notifications/read-all', { auth: 'affiliate' }),

    /** @param {{ current_password: string, password: string, password_confirmation: string }} payload */
    changePassword: (payload) => request('PUT', '/api/v1/affiliate/auth/password', { body: payload, auth: 'affiliate' }),
};
