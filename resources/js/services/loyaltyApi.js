import { request } from './client';

/** The store's loyalty points program. */
export const loyaltyApi = {
    /** `{ available, settings: { loyalty_enabled, loyalty_earn_rate, loyalty_point_value, loyalty_min_redeem }, stats }` */
    get: () => request('GET', '/api/v1/vendor/loyalty'),
    update: (settings) => request('PUT', '/api/v1/vendor/loyalty', { body: settings }),
    /** A customer's points history: `{ data, meta, balance }` */
    customerPoints: (customerId, page = 1) => request('GET', `/api/v1/vendor/customers/${customerId}/points`, { query: { page }, raw: true }),
    /** @param {{ points: number, note: string }} payload  Positive to give, negative to take. Returns `{ balance, transaction }`. */
    adjust: (customerId, payload) => request('POST', `/api/v1/vendor/customers/${customerId}/points`, { body: payload }),
};
