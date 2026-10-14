import { request } from './client';

const BASE = '/api/v1/vendor/reviews';

/** Product reviews left by the store's customers. */
export const reviewsApi = {
    /** @param {{ status?: 'pending'|'approved'|'rejected', rating?: number, search?: string, page?: number }} filters  Returns `{ data, meta, summary }`. */
    list: (filters) => request('GET', BASE, { query: filters }),
    /** @param {{ status?: 'pending'|'approved'|'rejected', reply?: string|null }} payload */
    update: (reviewId, payload) => request('PATCH', `${BASE}/${reviewId}`, { body: payload }),
    remove: (reviewId) => request('DELETE', `${BASE}/${reviewId}`),
};
