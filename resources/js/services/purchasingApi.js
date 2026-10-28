import { request } from './client';

const SUPPLIERS = '/api/v1/vendor/suppliers';
const ORDERS = '/api/v1/vendor/purchase-orders';

/** Suppliers and purchase orders. */
export const suppliersApi = {
    /** @param {{ search?: string }} query */
    list: (query = {}) => request('GET', SUPPLIERS, { query }),
    /** The list with each supplier's `account` and the store's `total_due`: `{ data, total_due }`. */
    listWithBalances: (query = {}) => request('GET', SUPPLIERS, { query, raw: true }),
    /** @param {{ name: string, contact_name?: string, phone?: string, email?: string, address?: string, notes?: string }} payload */
    create: (payload) => request('POST', SUPPLIERS, { body: payload }),
    update: (supplierId, payload) => request('PUT', `${SUPPLIERS}/${supplierId}`, { body: payload }),
    remove: (supplierId) => request('DELETE', `${SUPPLIERS}/${supplierId}`),
    /** `{ supplier, account: { received, returned, paid, balance }, entries }`, entries newest first with a running balance. */
    account: (supplierId) => request('GET', `${SUPPLIERS}/${supplierId}/account`),
    /** @param {{ amount: number, paid_at: string, method: string, reference?: string|null, note?: string|null }} payload  Returns the updated account. */
    addPayment: (supplierId, payload) => request('POST', `${SUPPLIERS}/${supplierId}/payments`, { body: payload }),
    removePayment: (supplierId, paymentId) => request('DELETE', `${SUPPLIERS}/${supplierId}/payments/${paymentId}`),
    /** @param {{ warehouse_id: number, note?: string|null, items: Array<{ variant_id: number, quantity: number, unit_cost: number }> }} payload */
    createReturn: (supplierId, payload) => request('POST', `${SUPPLIERS}/${supplierId}/returns`, { body: payload }),
};

export const purchaseOrdersApi = {
    /** @param {{ status?: string, supplier_id?: number, search?: string, page?: number }} filters  Returns `{ data, meta, summary }`. */
    list: (filters) => request('GET', ORDERS, { query: filters }),
    get: (purchaseOrderId) => request('GET', `${ORDERS}/${purchaseOrderId}`),
    /** @param {{ supplier_id: number, expected_at?: string|null, notes?: string|null, items: Array<{ variant_id: number, quantity: number, unit_cost: number }> }} payload */
    create: (payload) => request('POST', ORDERS, { body: payload }),
    update: (purchaseOrderId, payload) => request('PUT', `${ORDERS}/${purchaseOrderId}`, { body: payload }),
    remove: (purchaseOrderId) => request('DELETE', `${ORDERS}/${purchaseOrderId}`),
    markOrdered: (purchaseOrderId) => request('POST', `${ORDERS}/${purchaseOrderId}/order`),
    cancel: (purchaseOrderId) => request('POST', `${ORDERS}/${purchaseOrderId}/cancel`),
    close: (purchaseOrderId) => request('POST', `${ORDERS}/${purchaseOrderId}/close`),
    /** @param {Array<{ item_id: number, quantity: number }>} items */
    receive: (purchaseOrderId, items, note = null) => request('POST', `${ORDERS}/${purchaseOrderId}/receive`, { body: { items, note } }),
    /** @param {{ days?: 14|30|60|90, cover_days?: 7|14|30|60 }} filters  What to buy next, how many, and from whom. */
    reorderSuggestions: (filters) => request('GET', '/api/v1/vendor/reorder-suggestions', { query: filters }),
};
