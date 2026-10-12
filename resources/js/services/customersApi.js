import { request } from './client';

const BASE = '/api/v1/vendor/customers';

/** The store's shoppers (read-only: customers create their own accounts at checkout). */
export const customersApi = {
    /** @param {{ search?: string, sort?: 'recent'|'last_order'|'orders'|'spent', buyers?: 1, page?: number, per_page?: number }} filters */
    list: (filters) => request('GET', BASE, { query: filters }),
    /** `{ total, new_this_month, buyers, repeat_buyers }` */
    summary: () => request('GET', `${BASE}/summary`),
    get: (customerId) => request('GET', `${BASE}/${customerId}`),
};
