import { request, requestFile } from './client';

const BASE = '/api/v1/vendor/orders';

/** Vendor order management and shipping settings. */
export const ordersApi = {
    /** @param {{ ids?: number[], status?: string, search?: string, affiliate?: 1, affiliate_id?: number, customer_id?: number, payment_method?: string, payment_status?: string, page?: number, per_page?: number }} filters */
    list: (filters) => request('GET', BASE, { query: filters }),
    /** Counts per status plus `total`, `today` and `delivered_revenue`. */
    summary: () => request('GET', `${BASE}/summary`),
    get: (orderId) => request('GET', `${BASE}/${orderId}`),
    /** @param {'confirmed'|'shipped'|'delivered'|'cancelled'|'returned'} status */
    updateStatus: (orderId, status, note = null) => request('PATCH', `${BASE}/${orderId}/status`, { body: { status, note } }),
    /** Sends part or all of an online payment back to the customer through Paymob. */
    refund: (orderId, amount, reason = null) => request('POST', `${BASE}/${orderId}/refunds`, { body: { amount, reason } }),

    /** Ships a confirmed order with the connected Bosta account; returns the shipped order. */
    shipWithBosta: (orderId) => request('POST', `${BASE}/${orderId}/shipment`),
    /** Another company's name and tracking number. */
    updateTracking: (orderId, carrier, trackingNumber) => request('PUT', `${BASE}/${orderId}/tracking`, { body: { carrier, tracking_number: trackingNumber } }),
    /** Bosta airway bills for the given orders, as a PDF Blob. */
    airwayBills: (orderIds) => requestFile(`${BASE}/airway-bills`, { query: { ids: orderIds } }),

    /** `{ connected, api_key_hint, allow_open_package, verified_at }` */
    bostaConnection: () => request('GET', '/api/v1/vendor/shipping/bosta'),
    /** The API key is checked with Bosta before saving; leave it out to change options only. */
    saveBostaConnection: (payload) => request('PUT', '/api/v1/vendor/shipping/bosta', { body: payload }),
    disconnectBosta: () => request('DELETE', '/api/v1/vendor/shipping/bosta'),

    shippingSettings: () => request('GET', '/api/v1/vendor/shipping'),
    /** @param {{ default_shipping_price: number|null, free_shipping_threshold: number|null, rates: Array<{ governorate_id: string, is_enabled: boolean, price: number|null }> }} payload */
    saveShippingSettings: (payload) => request('PUT', '/api/v1/vendor/shipping', { body: payload }),
};
