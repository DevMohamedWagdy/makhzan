import { request, requestFile } from './client';

const BASE = '/api/v1/vendor/support-tickets';

/** The store's support tickets with the platform team. */
export const supportApi = {
    /** @param {{ status?: 'open'|'closed', type?: 'problem'|'suggestion', search?: string, page?: number }} filters  Returns `{ data, meta, summary }`. */
    list: (filters) => request('GET', BASE, { query: filters }),
    /** @param {{ subject: string, type: 'problem'|'suggestion', body: string, attachments?: File[] }} payload */
    create: (payload) => request('POST', BASE, { body: payload }),
    show: (ticketId) => request('GET', `${BASE}/${ticketId}`),
    /** @param {{ body?: string, attachments?: File[] }} payload */
    reply: (ticketId, payload) => request('POST', `${BASE}/${ticketId}/messages`, { body: payload }),
    /** Resolves to a Blob: attachments are private and need the session's token. */
    attachment: (ticketId, attachmentId) => requestFile(`${BASE}/${ticketId}/attachments/${attachmentId}`),
};
