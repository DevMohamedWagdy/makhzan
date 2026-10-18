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

const COLLECTIONS = '/api/v1/vendor/collections';

export const collectionsApi = {
    list: () => request('GET', COLLECTIONS),
    /** The collection with its `products` in display order. */
    get: (collectionId) => request('GET', `${COLLECTIONS}/${collectionId}`),
    create: (payload) => request('POST', COLLECTIONS, { body: payload }),
    update: (collectionId, payload) => request('PUT', `${COLLECTIONS}/${collectionId}`, { body: payload }),
    remove: (collectionId) => request('DELETE', `${COLLECTIONS}/${collectionId}`),

    /** Each returns the collection with its updated `products`. */
    addProducts: (collectionId, productIds) => request('POST', `${COLLECTIONS}/${collectionId}/products`, { body: { product_ids: productIds } }),
    removeProduct: (collectionId, productId) => request('DELETE', `${COLLECTIONS}/${collectionId}/products/${productId}`),
    reorderProducts: (collectionId, productIds) => request('PUT', `${COLLECTIONS}/${collectionId}/products/order`, { body: { product_ids: productIds } }),
};
