import { request } from './client';

const BASE = '/api/v1/vendor/affiliates';

export const affiliatesApi = {
    /** @returns {Promise<import('@/lib/schema').Paginated>} */
    list: (filters) => request('GET', BASE, { query: filters }),
    summary: () => request('GET', `${BASE}/summary`),
    get: (affiliateId) => request('GET', `${BASE}/${affiliateId}`),
    create: (payload) => request('POST', BASE, { body: payload }),
    update: (affiliateId, payload) => request('PUT', `${BASE}/${affiliateId}`, { body: payload }),
    remove: (affiliateId) => request('DELETE', `${BASE}/${affiliateId}`),

    /** @param {'active'|'frozen'} status */
    setStatus: (affiliateId, status, reason = null) => request('PATCH', `${BASE}/${affiliateId}/status`, { body: { status, reason } }),

    /** @param {{ use_tier_default: boolean, type: 'percentage'|'fixed', value: number, note?: string }} payload */
    setCommission: (affiliateId, payload) => request('PUT', `${BASE}/${affiliateId}/commission`, { body: payload }),

    createReferralCode: (affiliateId) => request('POST', `${BASE}/${affiliateId}/referral-codes`),
    /** Store-wide payouts with their affiliates: `{ data, meta, summary: { requested, paid, rejected } }`. @param {{ status?: 'requested'|'paid'|'rejected', page?: number }} query */
    listStorePayouts: (query = {}) => request('GET', '/api/v1/vendor/payouts', { query }),

    /** Payouts and transfer requests, newest first: { data, meta, summary: { total_paid } }. */
    listPayouts: (affiliateId, page = 1) => request('GET', `${BASE}/${affiliateId}/payouts`, { query: { page } }),

    /** Records a transfer already sent; fulfils the open request. Returns the affiliate. @param {{ amount: number, reference?: string, note?: string, paid_at?: string }} payload */
    recordPayout: (affiliateId, payload) => request('POST', `${BASE}/${affiliateId}/payouts`, { body: payload }),

    /** Declines an open transfer request. Returns the affiliate. */
    rejectPayout: (affiliateId, payoutId, note = null) => request('POST', `${BASE}/${affiliateId}/payouts/${payoutId}/reject`, { body: { note } }),

    impersonate: (affiliateId) => request('POST', `${BASE}/${affiliateId}/impersonate`),

    /** Rows use the CSV template columns, each with its original `line` number for error reporting. */
    importRows: (rows) => request('POST', `${BASE}/import`, { body: { rows } }),

    getRegistrationLink: () => request('GET', `${BASE}/registration-link`),
    updateRegistrationLink: (payload) => request('PATCH', `${BASE}/registration-link`, { body: payload }),
    regenerateRegistrationLink: () => request('POST', `${BASE}/registration-link/regenerate`),
};
