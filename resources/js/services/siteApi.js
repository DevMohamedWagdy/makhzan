import { request } from './client';

/** Public, unauthenticated website content the admin manages. */
export const siteApi = {
    /** @returns {Promise<{ whatsapp: string|null, contact_email: string|null }>} */
    contact: () => request('GET', '/api/v1/site/contact'),

    /**
     * A legal page's text in the reader's language; null content means "show the built-in document".
     *
     * @param {'terms'|'privacy'} document
     * @returns {Promise<{ content: string|null, updated_at: string|null }>}
     */
    legal: (document) => request('GET', `/api/v1/site/legal/${document}`),

    /**
     * Sends the landing page's contact form to the admin inbox.
     *
     * @param {{ full_name: string, phone: string, email: string, message: string, website: string }} payload
     * @returns {Promise<{ message: string }>}
     */
    sendMessage: (payload) => request('POST', '/api/v1/site/contact-messages', { body: payload }),
};
