import { request, requestFile } from './client';

/** Vendor sales reports. */
export const reportsApi = {
    /**
     * Totals (and the previous period's), daily series, statuses and rankings for a period.
     * @param {{ from?: string, to?: string }} period  Y-m-d dates; defaults to the last 30 days.
     */
    get: (period = {}) => request('GET', '/api/v1/vendor/reports', { query: period }),
    /** The same period as a formatted PDF (Blob): key figures, every section, then each order. */
    exportFile: (period = {}) => requestFile('/api/v1/vendor/reports/export', { query: period }),
    /** The store's owner and active team members the report can be emailed to (`is_me` marks the caller). */
    recipients: () => request('GET', '/api/v1/vendor/reports/recipients'),
    /**
     * Emails the period's PDF; resolves to `{ message }`.
     * @param {{ from?: string, to?: string, vendor_ids?: number[], emails?: string[] }} payload
     */
    email: (payload) => request('POST', '/api/v1/vendor/reports/email', { body: payload }),
};
