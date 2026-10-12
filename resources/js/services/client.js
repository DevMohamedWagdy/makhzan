import { ApiError, handleMockRequest } from './mock/server';
import { sessionStore, tokenFor } from './session';

export { ApiError, sessionStore };

/** Mock API is on unless VITE_USE_MOCK_API=false is set in .env. */
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== 'false';

function containsFile(value) {
    if (value instanceof File || value instanceof Blob) {
        return true;
    }

    return value !== null && typeof value === 'object' && Object.values(value).some(containsFile);
}

/** Flattens nested payloads into Laravel-style keys: vendor[full_name], store[logo]. */
export function toFormData(payload, formData = new FormData(), prefix = '') {
    for (const [key, value] of Object.entries(payload)) {
        const name = prefix ? `${prefix}[${key}]` : key;

        if (value === undefined || value === null) {
            continue;
        }

        if (value instanceof File || value instanceof Blob) {
            formData.append(name, value);
        } else if (typeof value === 'object') {
            toFormData(value, formData, name);
        } else {
            formData.append(name, typeof value === 'boolean' ? (value ? '1' : '0') : value);
        }
    }

    return formData;
}

/** Converts Laravel's "vendor.email" validation keys into ["vendor.email"] → message. */
function normalizeErrors(errors = {}) {
    return Object.fromEntries(Object.entries(errors).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]));
}

/**
 * @param {{ body?: object, query?: object, auth?: 'vendor' | 'affiliate' }} options
 *   `auth` picks which session's bearer token is sent (vendor by default).
 */
async function httpRequest(method, path, { body, query, auth = 'vendor' } = {}) {
    const url = new URL(path, window.location.origin);

    Object.entries(query ?? {}).forEach(([key, value]) => value !== '' && value != null && url.searchParams.set(key, value));

    const isMultipart = body && containsFile(body);
    const headers = {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content ?? '',
    };
    const token = tokenFor(auth);

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    if (body && !isMultipart) {
        headers['Content-Type'] = 'application/json';
    }

    // PHP only parses multipart bodies on POST, so spoof other verbs.
    const spoofed = isMultipart && method !== 'POST';
    const response = await fetch(url, {
        method: spoofed ? 'POST' : method,
        headers,
        body: body ? (isMultipart ? toFormData(spoofed ? { ...body, _method: method } : body) : JSON.stringify(body)) : undefined,
    });
    const data = await response.json().catch(() => ({}));

    if (response.status === 401 && token) {
        // Token expired or revoked: let the matching auth context sign that session out.
        window.dispatchEvent(new CustomEvent('makhzan:unauthorized', { detail: { scope: auth } }));
    }

    if (!response.ok) {
        throw new ApiError(response.status, data.message ?? 'حدث خطأ غير متوقع', normalizeErrors(data.errors));
    }

    // Unwrap single API resources ({ data }), but keep paginated collections ({ data, meta }) intact.
    return data && 'data' in data && !('meta' in data) ? data.data : data;
}

export function request(method, path, options = {}) {
    return USE_MOCK_API ? handleMockRequest(method, path, { ...options, token: tokenFor(options.auth ?? 'vendor') }) : httpRequest(method, path, options);
}
