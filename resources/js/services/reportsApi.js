import { request } from './client';

/** Vendor sales reports. */
export const reportsApi = {
    /**
     * Totals (and the previous period's), daily series, statuses and rankings for a period.
     * @param {{ from?: string, to?: string }} period  Y-m-d dates; defaults to the last 30 days.
     */
    get: (period = {}) => request('GET', '/api/v1/vendor/reports', { query: period }),
};
