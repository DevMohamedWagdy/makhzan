import { request } from './client';

/** Affiliate portal endpoints. Authenticated calls use the affiliate (or impersonation) token. */
export const affiliatePortalApi = {
    /** Public store identity for store-branded pages. */
    getStore: (slug) => request('GET', `/api/v1/stores/${encodeURIComponent(slug)}`),

    /** @param {{ store_slug: string, identifier: string, password: string, remember: boolean }} payload */
    login: (payload) => request('POST', '/api/v1/affiliate/auth/login', { body: payload }),

    /** @param {{ store_slug: string, identifier: string }} payload */
    forgotPassword: (payload) => request('POST', '/api/v1/affiliate/auth/forgot-password', { body: payload }),

    /** @param {{ store_slug: string, affiliate_id: number, token: string, password: string, password_confirmation: string }} payload */
    resetPassword: (payload) => request('POST', '/api/v1/affiliate/auth/reset-password', { body: payload }),

    me: () => request('GET', '/api/v1/affiliate/auth/me', { auth: 'affiliate' }),

    logout: () => request('POST', '/api/v1/affiliate/auth/logout', { auth: 'affiliate' }),

    /** @param {{ current_password: string, password: string, password_confirmation: string }} payload */
    changePassword: (payload) => request('PUT', '/api/v1/affiliate/auth/password', { body: payload, auth: 'affiliate' }),
};
