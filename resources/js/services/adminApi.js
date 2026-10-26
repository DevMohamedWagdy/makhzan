import { request, requestFile } from './client';

const BASE = '/api/v1/admin';
const auth = 'admin';

/** Platform admin panel endpoints (admin session). */
export const adminApi = {
    /** `{ token, admin }` */
    login: (payload) => request('POST', `${BASE}/auth/login`, { body: payload, auth }),
    logout: () => request('POST', `${BASE}/auth/logout`, { auth }),
    me: () => request('GET', `${BASE}/auth/me`, { auth }),

    notifications: (query = {}) => request('GET', `${BASE}/notifications`, { query, auth }),
    markNotificationRead: (id) => request('POST', `${BASE}/notifications/${id}/read`, { auth }),
    markAllNotificationsRead: () => request('POST', `${BASE}/notifications/read-all`, { auth }),

    overview: () => request('GET', `${BASE}/overview`, { auth }),

    /** @param {{ search?: string, status?: 'active'|'suspended', page?: number }} filters */
    stores: (filters) => request('GET', `${BASE}/stores`, { query: filters, auth }),
    store: (storeId) => request('GET', `${BASE}/stores/${storeId}`, { auth }),
    updateStore: (storeId, payload) => request('PATCH', `${BASE}/stores/${storeId}`, { body: payload, auth }),
    suspend: (storeId, reason) => request('POST', `${BASE}/stores/${storeId}/suspend`, { body: { reason }, auth }),
    unsuspend: (storeId) => request('POST', `${BASE}/stores/${storeId}/unsuspend`, { auth }),
    /** `{ token, vendor }` — a one-hour dashboard session as the store's owner. */
    impersonate: (storeId) => request('POST', `${BASE}/stores/${storeId}/impersonate`, { auth }),

    /** @param {{ store_id?: number, status?: string, search?: string, from?: string, to?: string, page?: number }} filters */
    orders: (filters) => request('GET', `${BASE}/orders`, { query: filters, auth }),
    order: (orderId) => request('GET', `${BASE}/orders/${orderId}`, { auth }),

    /** @param {{ status: string, note?: string }} payload  Returns the updated order. */
    updateOrderStatus: (orderId, payload) => request('PATCH', `${BASE}/orders/${orderId}/status`, { body: payload, auth }),

    /** @param {{ search?: string, store_id?: number, buyers?: boolean, page?: number }} filters */
    customers: (filters) => request('GET', `${BASE}/customers`, { query: filters, auth }),
    /** `{ data: customer, orders, points }` */
    customer: (customerId) => request('GET', `${BASE}/customers/${customerId}`, { auth, raw: true }),

    /** @param {{ search?: string, store_id?: number, status?: string, page?: number }} filters */
    affiliates: (filters) => request('GET', `${BASE}/affiliates`, { query: filters, auth }),
    /** `{ data: affiliate, orders, payouts }` */
    affiliate: (affiliateId) => request('GET', `${BASE}/affiliates/${affiliateId}`, { auth, raw: true }),
    setAffiliateStatus: (affiliateId, status, reason = null) => request('PATCH', `${BASE}/affiliates/${affiliateId}/status`, { body: { status, reason }, auth }),
    payouts: (filters) => request('GET', `${BASE}/payouts`, { query: filters, auth }),

    /** @param {{ search?: string, store_id?: number, status?: string, stock?: string, page?: number }} filters */
    products: (filters) => request('GET', `${BASE}/products`, { query: filters, auth }),
    product: (productId) => request('GET', `${BASE}/products/${productId}`, { auth }),

    payments: (filters) => request('GET', `${BASE}/payments`, { query: filters, auth }),
    coupons: (filters) => request('GET', `${BASE}/coupons`, { query: filters, auth }),

    /** Landing-page contact messages: `{ data, meta, summary: { unread, total } }`. */
    contactMessages: (filters) => request('GET', `${BASE}/contact-messages`, { query: filters, auth, raw: true }),
    updateContactMessage: (messageId, isRead) => request('PATCH', `${BASE}/contact-messages/${messageId}`, { body: { is_read: isRead }, auth }),
    deleteContactMessage: (messageId) => request('DELETE', `${BASE}/contact-messages/${messageId}`, { auth }),
    reviews: (filters) => request('GET', `${BASE}/reviews`, { query: filters, auth }),
    updateReview: (reviewId, status) => request('PATCH', `${BASE}/reviews/${reviewId}`, { body: { status }, auth }),
    deleteReview: (reviewId) => request('DELETE', `${BASE}/reviews/${reviewId}`, { auth }),

    /** @param {{ search?: string, type?: 'owner'|'staff', store_id?: number, page?: number }} filters */
    vendors: (filters) => request('GET', `${BASE}/vendors`, { query: filters, auth }),
    updateVendor: (vendorId, payload) => request('PATCH', `${BASE}/vendors/${vendorId}`, { body: payload, auth }),

    /** @param {{ status?: 'open'|'closed', type?: 'problem'|'suggestion', store_id?: number, awaiting_reply?: boolean, search?: string, page?: number }} filters  Returns `{ data, meta, summary, stores }`. */
    tickets: (filters) => request('GET', `${BASE}/support-tickets`, { query: filters, auth, raw: true }),
    ticket: (ticketId) => request('GET', `${BASE}/support-tickets/${ticketId}`, { auth }),
    /** @param {{ body?: string, attachments?: File[] }} payload */
    replyToTicket: (ticketId, payload) => request('POST', `${BASE}/support-tickets/${ticketId}/messages`, { body: payload, auth }),
    closeTicket: (ticketId) => request('POST', `${BASE}/support-tickets/${ticketId}/close`, { auth }),
    reopenTicket: (ticketId) => request('POST', `${BASE}/support-tickets/${ticketId}/reopen`, { auth }),
    /** Resolves to a Blob: attachments are private and need the admin's token. */
    ticketAttachment: (ticketId, attachmentId) => requestFile(`${BASE}/support-tickets/${ticketId}/attachments/${attachmentId}`, { auth }),

    /** @param {{ store_id?: number, actor_type?: string, actor_id?: number, subject_type?: string, subject_id?: number, event?: string, search?: string, from?: string, to?: string, page?: number }} filters */
    logs: (filters) => request('GET', `${BASE}/logs`, { query: filters, auth }),

    team: () => request('GET', `${BASE}/team`, { auth }),
    saveTeamMember: (payload, adminId = null) => request(adminId ? 'PUT' : 'POST', `${BASE}/team${adminId ? `/${adminId}` : ''}`, { body: payload, auth }),
    removeTeamMember: (adminId) => request('DELETE', `${BASE}/team/${adminId}`, { auth }),
    /** `{ data: roles, catalog }` */
    roles: () => request('GET', `${BASE}/roles`, { auth, raw: true }),
    saveRole: (payload, roleId = null) => request(roleId ? 'PUT' : 'POST', `${BASE}/roles${roleId ? `/${roleId}` : ''}`, { body: payload, auth }),
    removeRole: (roleId) => request('DELETE', `${BASE}/roles/${roleId}`, { auth }),

    /** Outgoing mail settings; the SMTP password comes back only as has_smtp_password. */
    mailSettings: () => request('GET', `${BASE}/settings/mail`, { auth }),
    /** Blank secrets keep the saved ones. */
    updateMailSettings: (payload) => request('PUT', `${BASE}/settings/mail`, { body: payload, auth }),
    /** Sends a test message now; `{ message }`. */
    testMail: (email) => request('POST', `${BASE}/settings/mail/test`, { body: { email }, auth }),

    /** The public website: footer contact channels and the Terms / Privacy text (Arabic and English). */
    siteSettings: () => request('GET', `${BASE}/settings/site`, { auth }),
    /** Blank fields clear; a blank legal page falls back to the built-in text. */
    updateSiteSettings: (payload) => request('PUT', `${BASE}/settings/site`, { body: payload, auth }),
};
