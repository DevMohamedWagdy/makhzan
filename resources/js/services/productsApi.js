import { request } from './client';

const PRODUCTS = '/api/v1/vendor/products';
const CATEGORIES = '/api/v1/vendor/product-categories';

export const productsApi = {
    /** @param {{ search?: string, category_id?: number, status?: string, stock?: 'in'|'low'|'out', page?: number, per_page?: number }} filters */
    list: (filters) => request('GET', PRODUCTS, { query: filters }),
    summary: () => request('GET', `${PRODUCTS}/summary`),
    get: (productId) => request('GET', `${PRODUCTS}/${productId}`),

    /** @param {{ category_id: number, name: string, description?: string, status: string, is_featured: boolean, options: Array<{ name: string, values: string[] }>, variants: Array<object> }} payload */
    create: (payload) => request('POST', PRODUCTS, { body: payload }),
    update: (productId, payload) => request('PUT', `${PRODUCTS}/${productId}`, { body: payload }),
    remove: (productId) => request('DELETE', `${PRODUCTS}/${productId}`),

    /** Returns all of the product's images: `{ data: [{ image_id, url }] }`. */
    uploadImages: (productId, files) => request('POST', `${PRODUCTS}/${productId}/images`, { body: { images: files } }),
    reorderImages: (productId, imageIds) => request('PUT', `${PRODUCTS}/${productId}/images/order`, { body: { image_ids: imageIds } }),
    removeImage: (productId, imageId) => request('DELETE', `${PRODUCTS}/${productId}/images/${imageId}`),
};

export const categoriesApi = {
    list: () => request('GET', CATEGORIES),
    /** `image` may be a File; `remove_image` clears the current one. */
    create: (payload) => request('POST', CATEGORIES, { body: payload }),
    update: (categoryId, payload) => request('PUT', `${CATEGORIES}/${categoryId}`, { body: payload }),
    remove: (categoryId) => request('DELETE', `${CATEGORIES}/${categoryId}`),
};
