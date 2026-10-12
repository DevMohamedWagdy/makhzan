import { request } from './client';

/** Public, unauthenticated endpoints behind a store's affiliate registration link. */
export const affiliateRegistrationApi = {
    /** @returns {Promise<{ store: { name: string, slug: string, logo_url: string|null }, tier: string, commission_percentage: number, requires_approval: boolean }>} */
    show: (token) => request('GET', `/api/v1/affiliate-registration/${encodeURIComponent(token)}`),

    /**
     * @param {{ full_name: string, phone: string, email: string|null, password: string, password_confirmation: string, payout_method: object }} payload
     * @returns {Promise<{ affiliate_id: number, status: string, requires_approval: boolean, referral_code: string|null, referral_url: string|null, message: string }>}
     */
    register: (token, payload) => request('POST', `/api/v1/affiliate-registration/${encodeURIComponent(token)}`, { body: payload }),
};
