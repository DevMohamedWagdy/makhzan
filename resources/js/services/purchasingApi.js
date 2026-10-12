import { request } from './client';

const SUPPLIERS = '/api/v1/vendor/suppliers';
const ORDERS = '/api/v1/vendor/purchase-orders';

/** Suppliers and purchase orders. */
export const suppliersApi = {
    /** @param {{ search?: string }} query */
    list: (query = {}) => request('GET', SUPPLIERS, { query }),
    /** @param {{ name: string, contact_name?: string, phone?: string, email?: string, address?: string, notes?: string }} payload */
    create: (payload) => request('POST', SUPPLIERS, { body: payload }),
    update: (supplierId, payload) => request('PUT', `${SUPPLIERS}/${supplierId}`, { body: payload }),
    remove: (supplierId) => request('DELETE', `${SUPPLIERS}/${supplierId}`),
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
};
