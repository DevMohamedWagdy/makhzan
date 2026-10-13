import { request } from './client';

const WAREHOUSES = '/api/v1/vendor/warehouses';
const TRANSFERS = '/api/v1/vendor/stock-transfers';

/** Warehouses (in fulfilment order) and stock transfers between them. */
export const warehousesApi = {
    /** Each with `units` and `cost_value`. */
    list: () => request('GET', WAREHOUSES),
    /** @param {{ name: string, address?: string|null, governorate_id?: string|null }} payload */
    create: (payload) => request('POST', WAREHOUSES, { body: payload }),
    update: (warehouseId, payload) => request('PUT', `${WAREHOUSES}/${warehouseId}`, { body: payload }),
    remove: (warehouseId) => request('DELETE', `${WAREHOUSES}/${warehouseId}`),
    /** @param {number[]} warehouseIds  every warehouse, first = default and sells first */
    reorder: (warehouseIds) => request('PUT', `${WAREHOUSES}/order`, { body: { warehouse_ids: warehouseIds } }),
};

export const transfersApi = {
    list: (page = 1) => request('GET', TRANSFERS, { query: { page } }),
    /** @param {{ from_warehouse_id: number, to_warehouse_id: number, note?: string|null, items: Array<{ variant_id: number, quantity: number }> }} payload */
    create: (payload) => request('POST', TRANSFERS, { body: payload }),
};
