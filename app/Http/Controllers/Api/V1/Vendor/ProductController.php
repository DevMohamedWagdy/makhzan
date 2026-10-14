<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Actions\Products\SaveProduct;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Vendor\ListProductsRequest;
use App\Http\Requests\Api\V1\Vendor\SaveProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class ProductController extends Controller
{
    /**
     * The store's products, newest first, filtered and paginated.
     */
    public function index(ListProductsRequest $request): AnonymousResourceCollection
    {
        $filters = $request->validated();

        $products = $request->user()->store->products()
            ->with(['category', 'variants', 'images'])
            ->search($filters['search'] ?? null)
            ->stockLevel($filters['stock'] ?? null)
            ->when($filters['category_id'] ?? null, fn ($query, $categoryId) => $query->where('category_id', $categoryId))
            ->when($filters['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->latest()
            ->latest('id')
            ->paginate($filters['per_page'] ?? 10)
            ->withQueryString();

        return ProductResource::collection($products);
    }

    /**
     * Create a product with its variants; images are uploaded separately.
     */
    public function store(SaveProductRequest $request, SaveProduct $saveProduct): JsonResponse
    {
        $store = $request->user()->store;

        if (! $store->canAddProduct()) {
            throw ValidationException::withMessages(['plan' => __('billing.product_limit', ['limit' => $store->currentPlan()->max_products])]);
        }

        $product = $saveProduct->handle($store, $request->validated());

        return (new ProductResource($product))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Product $product): ProductResource
    {
        Gate::authorize('view', $product);

        return new ProductResource($product->load(['category', 'variants', 'images']));
    }

    /**
     * Update the product and sync its variants.
     */
    public function update(SaveProductRequest $request, Product $product, SaveProduct $saveProduct): ProductResource
    {
        return new ProductResource($saveProduct->handle($request->user()->store, $request->validated(), $product));
    }

    /**
     * Soft-deletes the product so past orders keep their references; it disappears from the
     * dashboard and storefront.
     */
    public function destroy(Product $product): Response
    {
        Gate::authorize('delete', $product);

        $product->delete();

        return response()->noContent();
    }
}
