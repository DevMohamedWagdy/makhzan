import { request } from './client';

const BASE = '/api/v1/vendor/store';

/** The vendor's store settings. Each tab saves only its own fields. */
export const storeSettingsApi = {
    get: () => request('GET', BASE),
    update: (fields) => request('PATCH', BASE, { body: fields }),
    uploadLogo: (file) => request('POST', `${BASE}/logo`, { body: { logo: file } }),
    removeLogo: () => request('DELETE', `${BASE}/logo`),
};
