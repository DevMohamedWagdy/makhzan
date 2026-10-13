import { request } from './client';

const BASE = '/api/v1/vendor/orders';

/** Vendor order management and shipping settings. */
export const ordersApi = {
    /** @param {{ status?: string, search?: string, affiliate?: 1, affiliate_id?: number, customer_id?: number, payment_method?: string, payment_status?: string, page?: number, per_page?: number }} filters */
    list: (filters) => request('GET', BASE, { query: filters }),
    /** Counts per status plus `total`, `today` and `delivered_revenue`. */
    summary: () => request('GET', `${BASE}/summary`),
    get: (orderId) => request('GET', `${BASE}/${orderId}`),
    /** @param {'confirmed'|'shipped'|'delivered'|'cancelled'|'returned'} status */
    updateStatus: (orderId, status, note = null) => request('PATCH', `${BASE}/${orderId}/status`, { body: { status, note } }),
    /** Sends part or all of an online payment back to the customer through Paymob. */
    refund: (orderId, amount, reason = null) => request('POST', `${BASE}/${orderId}/refunds`, { body: { amount, reason } }),

    shippingSettings: () => request('GET', '/api/v1/vendor/shipping'),
    /** @param {{ default_shipping_price: number|null, free_shipping_threshold: number|null, rates: Array<{ governorate_id: string, is_enabled: boolean, price: number|null }> }} payload */
    saveShippingSettings: (payload) => request('PUT', '/api/v1/vendor/shipping', { body: payload }),
};
