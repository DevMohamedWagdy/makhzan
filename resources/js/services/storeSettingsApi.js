import { request } from './client';

const BASE = '/api/v1/vendor/store';

/** The vendor's store settings. Each tab saves only its own fields. */
export const storeSettingsApi = {
    get: () => request('GET', BASE),
    update: (fields) => request('PATCH', BASE, { body: fields }),
    uploadLogo: (file) => request('POST', `${BASE}/logo`, { body: { logo: file } }),
    removeLogo: () => request('DELETE', `${BASE}/logo`),

    /** `{ domain, verified_at, cname_target, ip }` */
    domain: () => request('GET', `${BASE}/domain`),
    saveDomain: (domain) => request('PUT', `${BASE}/domain`, { body: { domain } }),
    /** Checks the domain's DNS; 422 on `domain` while it doesn't point to us yet. */
    verifyDomain: () => request('POST', `${BASE}/domain/verify`),
    removeDomain: () => request('DELETE', `${BASE}/domain`),

    /** `{ cod_enabled, methods, paymob: { is_live, public_key, secret_key_hint, hmac_secret_hint, card_integration_id, wallet_integration_id, verified_at } | null, webhook_url }` */
    /** Ad platform accounts: `{ server_side_available, pixels: { meta, tiktok, google } }` (null when not connected). */
    trackingPixels: () => request('GET', '/api/v1/vendor/tracking-pixels'),
    /** @param {{ [provider: string]: { pixel_id: string, access_token?: string, test_event_code?: string, is_active?: boolean } }} pixels  An empty pixel_id disconnects. */
    updateTrackingPixels: (pixels) => request('PUT', '/api/v1/vendor/tracking-pixels', { body: { pixels } }),
    payments: () => request('GET', '/api/v1/vendor/payments'),
    /** @param {{ cod_enabled?: boolean, paymob?: { secret_key?: string, public_key: string, hmac_secret?: string, card_integration_id?: string, wallet_integration_id?: string } }} payload */
    updatePayments: (payload) => request('PUT', '/api/v1/vendor/payments', { body: payload }),
    disconnectPaymob: () => request('DELETE', '/api/v1/vendor/payments/paymob'),
};
