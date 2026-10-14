import { request } from './client';

/** The owner's own subscription (vendor dashboard). */
export const subscriptionApi = {
    /** `{ plan, expires_at, usage: { products, staff }, plans, pending_request, payments, payment_accounts, support_whatsapp }` */
    get: () => request('GET', '/api/v1/vendor/subscription'),
    /** @param {{ plan_id: number, months: 1|3|6|12, method: string, reference: string, notes?: string }} payload */
    requestPlan: (payload) => request('POST', '/api/v1/vendor/subscription/requests', { body: payload }),
};
