<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Vendor\SaveProductCollectionRequest;
use App\Http\Resources\ProductCollectionResource;
use App\Models\ProductCollection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

class ProductCollectionController extends Controller
{
    /**
     * All of the store's collections in display order, with their product counts.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        return ProductCollectionResource::collection($request->user()->store->productCollections()->withCount('products')->get());
    }

    /**
     * Add a collection at the end of the list.
     */
    public function store(SaveProductCollectionRequest $request): JsonResponse
    {
        $store = $request->user()->store;

        $collection = $store->productCollections()->create([
            ...$request->safe()->only(['name', 'name_en', 'is_active']),
            'position' => $request->validated('position') ?? (int) $store->productCollections()->max('position') + 1,
        ]);

        return (new ProductCollectionResource($collection->loadCount('products')))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    /**
     * A collection with its products in order, for the product picker.
     */
    public function show(ProductCollection $collection): ProductCollectionResource
    {
        Gate::authorize('view', $collection);

        return new ProductCollectionResource($collection->load('products.images', 'products.variants')->loadCount('products'));
    }

    /**
     * Rename, reorder or hide/show a collection.
     */
    public function update(SaveProductCollectionRequest $request, ProductCollection $collection): ProductCollectionResource
    {
        $collection->update($request->safe()->only(['name', 'name_en', 'is_active', 'position']));

        return new ProductCollectionResource($collection->loadCount('products'));
    }

    /**
     * Delete a collection; its products stay in the catalog.
     */
    public function destroy(ProductCollection $collection): Response
    {
        Gate::authorize('delete', $collection);

        $collection->delete();

        return response()->noContent();
    }
}
