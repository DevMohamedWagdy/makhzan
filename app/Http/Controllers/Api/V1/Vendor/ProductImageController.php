<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Vendor\ReorderProductImagesRequest;
use App\Http\Requests\Api\V1\Vendor\StoreProductImagesRequest;
use App\Http\Resources\ProductImageResource;
use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

class ProductImageController extends Controller
{
    /**
     * Append uploaded photos after the existing ones; returns all of the product's images.
     */
    public function store(StoreProductImagesRequest $request, Product $product): AnonymousResourceCollection
    {
        $position = (int) $product->images()->max('position');

        foreach ($request->file('images') as $file) {
            $product->images()->create([
                'path' => $file->store("stores/{$product->store_id}/products", 'public'),
                'position' => ++$position,
            ]);
        }

        return ProductImageResource::collection($product->images()->get());
    }

    /**
     * Save the new order; the first image becomes the main one.
     */
    public function reorder(ReorderProductImagesRequest $request, Product $product): AnonymousResourceCollection
    {
        foreach ($request->validated('image_ids') as $position => $imageId) {
            $product->images()->whereKey($imageId)->update(['position' => $position]);
        }

        return ProductImageResource::collection($product->images()->get());
    }

    public function destroy(Product $product, ProductImage $image): Response
    {
        Gate::authorize('update', $product);

        $image->delete();
        Storage::disk('public')->delete($image->path);

        return response()->noContent();
    }
}
