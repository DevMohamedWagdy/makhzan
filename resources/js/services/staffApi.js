import { request } from './client';

const BASE = '/api/v1/vendor/staff';

/** The owner's team members (owner only). */
export const staffApi = {
    list: () => request('GET', BASE),
    /** @param {{ full_name: string, phone: string, email: string, password: string, role_id: number, is_active?: boolean }} payload */
    create: (payload) => request('POST', BASE, { body: payload }),
    /** A blank password keeps the current one. */
    update: (staffId, payload) => request('PUT', `${BASE}/${staffId}`, { body: payload }),
    remove: (staffId) => request('DELETE', `${BASE}/${staffId}`),

    /** `{ data: roles, catalog: { section: actions[] } }` */
    roles: () => request('GET', '/api/v1/vendor/roles', { raw: true }),
    saveRole: (payload, roleId = null) => request(roleId ? 'PUT' : 'POST', `/api/v1/vendor/roles${roleId ? `/${roleId}` : ''}`, { body: payload }),
    removeRole: (roleId) => request('DELETE', `/api/v1/vendor/roles/${roleId}`),
};
