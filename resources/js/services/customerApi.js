import { request } from './client';

/** Shopper account endpoints of one store; authenticated calls use that store's customer session. */
export function customerApi(storeSlug) {
    const base = `/api/v1/storefront/${encodeURIComponent(storeSlug)}`;
    const auth = `customer:${storeSlug}`;

    return {
        /** @param {{ full_name: string, phone: string, email?: string, password: string, password_confirmation: string }} payload  `{ token, customer }` */
        register: (payload) => request('POST', `${base}/customer/register`, { body: payload }),
        /** `{ token, customer }` */
        login: (payload) => request('POST', `${base}/customer/login`, { body: payload }),
        me: () => request('GET', `${base}/customer/me`, { auth }),
        logout: () => request('POST', `${base}/customer/logout`, { auth }),

        addresses: () => request('GET', `${base}/customer/addresses`, { auth }),
        saveAddress: (payload, addressId = null) => request(addressId ? 'PUT' : 'POST', `${base}/customer/addresses${addressId ? `/${addressId}` : ''}`, { body: payload, auth }),
        removeAddress: (addressId) => request('DELETE', `${base}/customer/addresses/${addressId}`, { auth }),

        /** Governorates the store delivers to: `{ rates: [{ governorate_id, price }], free_shipping_threshold }` */
        shipping: () => request('GET', `${base}/shipping`),

        orders: (page = 1) => request('GET', `${base}/customer/orders`, { query: { page }, auth }),
        order: (number) => request('GET', `${base}/customer/orders/${number}`, { auth }),
        /** @param {{ items: Array<{ variant_id: number, quantity: number }>, address_id?: number, address?: object, save_address?: boolean, referral_code?: string|null, note?: string }} payload */
        placeOrder: (payload) => request('POST', `${base}/customer/orders`, { body: payload, auth }),
        cancelOrder: (number, reason = null) => request('POST', `${base}/customer/orders/${number}/cancel`, { body: { reason }, auth }),
    };
}
