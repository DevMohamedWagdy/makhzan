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
        /** Emails a reset link when the account has an email; always `{ message }`. */
        forgotPassword: (identifier) => request('POST', `${base}/customer/forgot-password`, { body: { identifier } }),
        /** @param {{ customer_id: number, token: string, password: string, password_confirmation: string }} payload */
        resetPassword: (payload) => request('POST', `${base}/customer/reset-password`, { body: payload }),
        me: () => request('GET', `${base}/customer/me`, { auth }),
        logout: () => request('POST', `${base}/customer/logout`, { auth }),

        addresses: () => request('GET', `${base}/customer/addresses`, { auth }),
        saveAddress: (payload, addressId = null) => request(addressId ? 'PUT' : 'POST', `${base}/customer/addresses${addressId ? `/${addressId}` : ''}`, { body: payload, auth }),
        removeAddress: (addressId) => request('DELETE', `${base}/customer/addresses/${addressId}`, { auth }),

        /** Governorates the store delivers to: `{ rates: [{ governorate_id, price }], free_shipping_threshold }` */
        shipping: () => request('GET', `${base}/shipping`),

        /** Checks a discount code against the cart: `{ code, type, value, description, discount, free_shipping }` or 422 on coupon_code. */
        checkCoupon: (couponCode, items) => request('POST', `${base}/customer/coupon`, { body: { coupon_code: couponCode, items }, auth }),

        orders: (page = 1) => request('GET', `${base}/customer/orders`, { query: { page }, auth }),
        order: (number) => request('GET', `${base}/customer/orders/${number}`, { auth }),
        /**
         * Online orders come back with `payment.checkout_url` to send the customer to.
         * @param {{ items: Array<{ variant_id: number, quantity: number }>, address_id?: number, address?: object, save_address?: boolean, referral_code?: string|null, coupon_code?: string|null, note?: string, payment_method?: 'cod'|'card'|'wallet' }} payload
         */
        placeOrder: (payload) => request('POST', `${base}/customer/orders`, { body: payload, auth }),
        /** Opens a new payment page for an unpaid online order: the order with `payment.checkout_url`. */
        payOrder: (number) => request('POST', `${base}/customer/orders/${number}/pay`, { auth }),
        /** `{ can_review, review }` for the signed-in customer and this product. */
        reviewStatus: (productSlug) => request('GET', `${base}/customer/products/${encodeURIComponent(productSlug)}/review`, { auth }),
        /** @param {{ rating: number, body?: string|null, images?: File[] }} payload  The new (pending) review. */
        submitReview: (productSlug, payload) => request('POST', `${base}/customer/products/${encodeURIComponent(productSlug)}/review`, { body: payload, auth }),
        cancelOrder: (number, reason = null) => request('POST', `${base}/customer/orders/${number}/cancel`, { body: { reason }, auth }),
    };
}
