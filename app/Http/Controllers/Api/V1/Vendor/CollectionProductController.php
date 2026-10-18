<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Vendor\AttachCollectionProductsRequest;
use App\Http\Requests\Api\V1\Vendor\ReorderCollectionProductsRequest;
use App\Http\Resources\ProductCollectionResource;
use App\Models\Product;
use App\Models\ProductCollection;
use Illuminate\Support\Facades\Gate;

/**
 * Adds, removes and orders the products inside a collection.
 */
class CollectionProductController extends Controller
{
    /**
     * Append products to the end of the collection; ones already in it are left where they are.
     */
    public function store(AttachCollectionProductsRequest $request, ProductCollection $collection): ProductCollectionResource
    {
        $existing = $collection->products()->pluck('products.id')->all();
        $position = (int) $collection->products()->max('collection_products.position');

        $newProducts = collect($request->validated('product_ids'))
            ->diff($existing)
            ->mapWithKeys(fn (int $productId): array => [$productId => ['position' => ++$position]]);

        $collection->products()->attach($newProducts->all());

        return $this->fresh($collection);
    }

    /**
     * Take a product out of the collection (the product itself is untouched).
     */
    public function destroy(ProductCollection $collection, Product $product): ProductCollectionResource
    {
        Gate::authorize('update', $collection);

        $collection->products()->detach($product->id);

        return $this->fresh($collection);
    }

    /**
     * Save a new order for the collection's products.
     */
    public function reorder(ReorderCollectionProductsRequest $request, ProductCollection $collection): ProductCollectionResource
    {
        foreach ($request->validated('product_ids') as $position => $productId) {
            $collection->products()->updateExistingPivot($productId, ['position' => $position]);
        }

        return $this->fresh($collection);
    }

    private function fresh(ProductCollection $collection): ProductCollectionResource
    {
        return new ProductCollectionResource($collection->load('products.images', 'products.variants')->loadCount('products'));
    }
}
