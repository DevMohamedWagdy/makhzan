import { request } from './client';

const BASE = '/api/v1/vendor/coupons';

/** The vendor's discount codes. */
export const couponsApi = {
    /** @param {{ state?: 'active'|'scheduled'|'expired'|'disabled', search?: string, page?: number }} filters  Returns `{ data, meta, summary }`. */
    list: (filters) => request('GET', BASE, { query: filters }),
    /** With `targets` (names of the products / categories it applies to). */
    get: (couponId) => request('GET', `${BASE}/${couponId}`),
    create: (payload) => request('POST', BASE, { body: payload }),
    update: (couponId, payload) => request('PUT', `${BASE}/${couponId}`, { body: payload }),
    setActive: (couponId, isActive) => request('PATCH', `${BASE}/${couponId}/status`, { body: { is_active: isActive } }),
    remove: (couponId) => request('DELETE', `${BASE}/${couponId}`),
};
