import { request } from './client';

const BASE = '/api/v1/vendor/payment-transactions';

/** The store's Paymob payment attempts and refunds. */
export const paymentsApi = {
    /** @param {{ from?: string, to?: string, kind?: 'payment'|'refund', status?: 'paid'|'failed'|'pending', method?: 'card'|'wallet', search?: string, page?: number }} filters */
    list: (filters) => request('GET', BASE, { query: filters }),
    /** `{ connected, collected, refunded, net, successful, failed, awaiting: { count, amount }, to_refund: { count, amount, order_id } }` */
    summary: (filters) => request('GET', `${BASE}/summary`, { query: filters }),
    /** The filtered list without paging (up to 5,000 rows), for the spreadsheet. */
    exportAll: (filters) => request('GET', `${BASE}/export`, { query: filters }),
};
