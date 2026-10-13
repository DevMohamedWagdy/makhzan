import { request } from './client';

const base = (storeSlug) => `/api/v1/storefront/${encodeURIComponent(storeSlug)}`;

/** Public shopper endpoints (no auth). */
export const storefrontApi = {
    /** One policy page: `{ key, title, body }`. @param {'returns'|'shipping'|'privacy'|'terms'} key */
    policy: (storeSlug, key) => request('GET', `${base(storeSlug)}/policies/${key}`),

    /** `{ store, categories, featured, latest }` */
    home: (storeSlug) => request('GET', base(storeSlug)),

    /** @param {{ category?: string, search?: string, sort?: 'newest'|'price_asc'|'price_desc', page?: number }} query  `{ data, meta, category }` */
    products: (storeSlug, query = {}) => request('GET', `${base(storeSlug)}/products`, { query }),

    /** `{ product, related }` */
    product: (storeSlug, productSlug) => request('GET', `${base(storeSlug)}/products/${encodeURIComponent(productSlug)}`),

    recordReferralClick: (storeSlug, code) => request('POST', `${base(storeSlug)}/referral-clicks`, { body: { code } }),

    /** @param {Array<{ variant_id: number, quantity: number }>} items  `{ lines, subtotal, items_count }` */
    quoteCart: (storeSlug, items) => request('POST', `${base(storeSlug)}/cart/quote`, { body: { items } }),
};
