import { request } from './client';

export const authApi = {
    /** @param {{ identifier: string, password: string, remember: boolean }} payload */
    login: (payload) => request('POST', '/api/v1/vendor/auth/login', { body: payload }),

    /**
     * @param {{
     *   vendor: { full_name: string, phone: string, email: string, password: string, password_confirmation: string },
     *   store: { name: string, slug: string, logo: File|null, governorate_id: string, city_id: string },
     * }} payload
     */
    register: (payload) => request('POST', '/api/v1/vendor/auth/register', { body: payload }),

    checkSlug: (slug) => request('GET', '/api/v1/stores/slug-availability', { query: { slug } }),

    logout: () => request('POST', '/api/v1/vendor/auth/logout'),

    forgotPassword: (identifier) => request('POST', '/api/v1/vendor/auth/forgot-password', { body: { identifier } }),

    /** @param {{ token: string, email: string, password: string, password_confirmation: string }} payload */
    resetPassword: (payload) => request('POST', '/api/v1/vendor/auth/reset-password', { body: payload }),
};
