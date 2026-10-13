import { request } from './client';

const BASE = '/api/v1/vendor/inventory';

/** Stock per variant, stock movements and inventory settings. */
export const inventoryApi = {
    /** @param {{ search?: string, category_id?: number, level?: 'in'|'low'|'out', missing_cost?: 1, sort?: 'name'|'stock_asc'|'stock_desc'|'value', page?: number, per_page?: number }} filters */
    list: (filters) => request('GET', BASE, { query: filters }),
    /** Units, value at cost and retail, expected profit, level counts and the store's threshold. */
    summary: () => request('GET', `${BASE}/summary`),
    /** @param {{ cost?: number|null, low_stock_threshold?: number|null }} payload */
    updateItem: (variantId, payload) => request('PATCH', `${BASE}/${variantId}`, { body: payload }),
    /**
     * Restock and damage take units added or written off; an adjustment takes the counted quantity.
     * @param {{ type: 'restock'|'adjustment'|'damage', quantity: number, warehouse_id?: number, unit_cost?: number|null, note?: string|null }} payload
     * Returns `{ movement, item }`.
     */
    recordMovement: (variantId, payload) => request('POST', `${BASE}/${variantId}/movements`, { body: payload }),
    /** @param {{ type?: string, variant_id?: number, warehouse_id?: number, search?: string, from?: string, to?: string, page?: number, per_page?: number }} filters */
    movements: (filters) => request('GET', `${BASE}/movements`, { query: filters }),
    /** Every variant (same shape as `list` rows, with `warehouses`) for the spreadsheet export. */
    exportAll: () => request('GET', `${BASE}/export`),
    /**
     * Counted stock (for one warehouse; the default when omitted) and costs from an edited export. Returns `{ updated, unchanged, skipped, errors: [{ row, message }] }`.
     * @param {Array<{ line: number, variant_id?: string, sku?: string, stock?: string, cost?: string }>} rows
     */
    importRows: (rows, warehouseId) => request('POST', `${BASE}/import`, { body: { rows, warehouse_id: warehouseId } }),
    /** @param {{ low_stock_threshold: number }} payload */
    updateSettings: (payload) => request('PUT', `${BASE}/settings`, { body: payload }),
};
