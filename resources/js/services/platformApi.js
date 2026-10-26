import { request } from './client';

/** Public, unauthenticated platform endpoints for the landing page. */
export const platformApi = {
    /** @returns {Promise<{ stores: number, orders: number, products: number, sales: number }>} */
    stats: () => request('GET', '/api/v1/platform-stats'),
};
