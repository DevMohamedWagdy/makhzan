<?php

namespace App\Http\Controllers\Api\V1\Storefront\Customer;

use App\Http\Controllers\Controller;
use App\Http\Resources\StorefrontProductResource;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class WishlistController extends Controller
{
    /**
     * Saved products still on sale, most recently saved first.
     */
    public function index(Request $request, Store $store): AnonymousResourceCollection
    {
        $products = $store->products()
            ->visibleInStore()
            ->with(['category', 'variants', 'images'])
            ->join('wishlist_items', 'wishlist_items.product_id', '=', 'products.id')
            ->where('wishlist_items.customer_id', $request->user()->id)
            ->orderByDesc('wishlist_items.id')
            ->select('products.*')
            ->get();

        return StorefrontProductResource::collection($products);
    }

    public function store(Request $request, Store $store): JsonResponse
    {
        $productId = $request->validate(['product_id' => ['required', 'integer']])['product_id'];
        $product = $store->products()->visibleInStore()->find($productId) ?? abort(404, __('products.not_found'));

        $request->user()->wishlistItems()->firstOrCreate(['product_id' => $product->id]);

        return response()->json(['product_id' => $product->id], Response::HTTP_CREATED);
    }

    public function destroy(Request $request, Store $store, int $productId): Response
    {
        $request->user()->wishlistItems()->where('product_id', $productId)->delete();

        return response()->noContent();
    }
}
