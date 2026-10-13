<?php

namespace App\Http\Controllers\Api\V1\Storefront;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Storefront\ListStorefrontProductsRequest;
use App\Http\Resources\StorefrontCategoryResource;
use App\Http\Resources\StorefrontProductResource;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProductController extends Controller
{
    /**
     * Visible products, optionally in one category or matching a search, 24 per page.
     */
    public function index(ListStorefrontProductsRequest $request, Store $store): AnonymousResourceCollection
    {
        $category = $request->filled('category')
            ? $store->productCategories()->where('is_active', true)->where('slug', $request->validated('category'))->first() ?? abort(404, __('products.category_not_found'))
            : null;

        $products = $store->products()
            ->visibleInStore()
            ->with(['category', 'variants', 'images'])
            ->when($category, fn ($query) => $query->where('category_id', $category->id))
            ->when($request->validated('search'), fn ($query, string $term) => $query->where('name', 'like', "%{$term}%"))
            ->sortForStorefront($request->validated('sort'))
            ->paginate(24)
            ->withQueryString();

        return StorefrontProductResource::collection($products)
            ->additional(['category' => $category ? new StorefrontCategoryResource($category) : null]);
    }

    /**
     * The product page, with up to four related products from the same category.
     */
    public function show(Store $store, string $productSlug): JsonResponse
    {
        $product = $store->products()->visibleInStore()->with(['category', 'variants', 'images'])->where('slug', $productSlug)->first()
            ?? abort(404, __('products.not_found'));

        $related = $store->products()
            ->visibleInStore()
            ->with(['category', 'variants', 'images'])
            ->where('category_id', $product->category_id)
            ->whereKeyNot($product->id)
            ->inRandomOrder()
            ->limit(4)
            ->get();

        return response()->json([
            'product' => (new StorefrontProductResource($product))->detailed(),
            'related' => StorefrontProductResource::collection($related),
        ]);
    }
}
