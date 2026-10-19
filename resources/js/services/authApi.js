import { request } from './client';

export const authApi = {
    /**
     * `{ token, vendor }`, or `{ verification_required, challenge, email, resend_in }` when the
     * email still has to be confirmed with a code.
     *
     * @param {{ email: string, password: string, remember: boolean }} payload
     */
    login: (payload) => request('POST', '/api/v1/vendor/auth/login', { body: payload }),

    /**
     * @param {{
     *   vendor: { full_name: string, phone: string, email: string, password: string, password_confirmation: string },
     *   store: { name: string, slug: string, logo: File|null, governorate_id: string, city_id: string },
     * }} payload  Returns the verification challenge: the code is emailed before any sign-in.
     */
    register: (payload) => request('POST', '/api/v1/vendor/auth/register', { body: payload }),

    /** Confirms the emailed 6-digit code; returns `{ token, vendor }`. */
    verifyEmail: (challenge, code) => request('POST', '/api/v1/vendor/auth/verify-email', { body: { challenge, code } }),

    /** Emails a new code for the same challenge. */
    resendVerification: (challenge) => request('POST', '/api/v1/vendor/auth/verify-email/resend', { body: { challenge } }),

    checkSlug: (slug) => request('GET', '/api/v1/stores/slug-availability', { query: { slug } }),

    logout: () => request('POST', '/api/v1/vendor/auth/logout'),
    /** The signed-in vendor with their store and permissions; refreshes the session. */
    me: () => request('GET', '/api/v1/vendor/auth/me'),

    /** @param {{ full_name: string, phone: string, email: string }} payload  Returns the vendor with their store. */
    updateProfile: (payload) => request('PUT', '/api/v1/vendor/auth/profile', { body: payload }),

    /** Signs out the vendor's other sessions. @param {{ current_password: string, password: string, password_confirmation: string }} payload */
    updatePassword: (payload) => request('PUT', '/api/v1/vendor/auth/password', { body: payload }),

    forgotPassword: (email) => request('POST', '/api/v1/vendor/auth/forgot-password', { body: { email } }),

    /** @param {{ token: string, email: string, password: string, password_confirmation: string }} payload */
    resetPassword: (payload) => request('POST', '/api/v1/vendor/auth/reset-password', { body: payload }),
};
