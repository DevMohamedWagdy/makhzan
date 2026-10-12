<?php

namespace App\Http\Controllers\Api\V1\Storefront;

use App\Http\Controllers\Controller;
use App\Http\Resources\PublicStoreResource;
use App\Http\Resources\StorefrontCategoryResource;
use App\Http\Resources\StorefrontProductResource;
use App\Models\Store;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;

class StorefrontController extends Controller
{
    /**
     * Store home page: identity, visible categories, featured and newest products.
     */
    public function show(Store $store): JsonResponse
    {
        $visibleProducts = fn (): Builder => $store->products()->visibleInStore()->with(['category', 'variants', 'images'])->getQuery();

        $categories = $store->productCategories()
            ->where('is_active', true)
            ->withCount(['products' => fn (Builder $query) => $query->visibleInStore()])
            ->get()
            ->filter(fn ($category): bool => $category->products_count > 0)
            ->values();

        return response()->json([
            'store' => new PublicStoreResource($store),
            'categories' => StorefrontCategoryResource::collection($categories),
            'featured' => StorefrontProductResource::collection($visibleProducts()->where('is_featured', true)->latest()->limit(8)->get()),
            'latest' => StorefrontProductResource::collection($visibleProducts()->latest()->latest('id')->limit(8)->get()),
        ]);
    }
}
