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
    /** The signed-in vendor with their store (billing status, permissions); refreshes the session. */
    me: () => request('GET', '/api/v1/vendor/auth/me'),

    /** @param {{ full_name: string, phone: string, email: string }} payload  Returns the vendor with their store. */
    updateProfile: (payload) => request('PUT', '/api/v1/vendor/auth/profile', { body: payload }),

    /** Signs out the vendor's other sessions. @param {{ current_password: string, password: string, password_confirmation: string }} payload */
    updatePassword: (payload) => request('PUT', '/api/v1/vendor/auth/password', { body: payload }),

    forgotPassword: (identifier) => request('POST', '/api/v1/vendor/auth/forgot-password', { body: { identifier } }),

    /** @param {{ token: string, email: string, password: string, password_confirmation: string }} payload */
    resetPassword: (payload) => request('POST', '/api/v1/vendor/auth/reset-password', { body: payload }),
};
