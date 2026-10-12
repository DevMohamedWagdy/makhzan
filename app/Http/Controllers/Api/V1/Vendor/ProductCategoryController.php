<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Vendor\SaveProductCategoryRequest;
use App\Http\Resources\ProductCategoryResource;
use App\Models\ProductCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class ProductCategoryController extends Controller
{
    /**
     * All of the store's categories in display order, with their product counts.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        return ProductCategoryResource::collection($request->user()->store->productCategories()->withCount('products')->get());
    }

    /**
     * Add a category at the end of the list.
     */
    public function store(SaveProductCategoryRequest $request): JsonResponse
    {
        $store = $request->user()->store;

        $category = $store->productCategories()->create([
            ...$request->safe()->only(['name', 'description', 'is_active']),
            'slug' => ProductCategory::uniqueSlug($store->id, $request->validated('name')),
            'position' => $request->validated('position') ?? (int) $store->productCategories()->max('position') + 1,
            'image_path' => $request->file('image')?->store("stores/{$store->id}/categories", 'public'),
        ]);

        return (new ProductCategoryResource($category->loadCount('products')))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    /**
     * Rename, describe, reorder, hide/show or change the image of a category.
     */
    public function update(SaveProductCategoryRequest $request, ProductCategory $category): ProductCategoryResource
    {
        $previousImage = $category->image_path;
        $category->fill($request->safe()->only(['name', 'description', 'is_active', 'position']));

        if ($request->hasFile('image')) {
            $category->image_path = $request->file('image')->store("stores/{$category->store_id}/categories", 'public');
        } elseif ($request->boolean('remove_image')) {
            $category->image_path = null;
        }

        $category->save();

        if ($previousImage && $previousImage !== $category->image_path) {
            Storage::disk('public')->delete($previousImage);
        }

        return new ProductCategoryResource($category->loadCount('products'));
    }

    /**
     * Delete an empty category; one that still has products must be emptied first.
     */
    public function destroy(ProductCategory $category): Response
    {
        Gate::authorize('delete', $category);

        if ($category->products()->withTrashed()->exists()) {
            throw ValidationException::withMessages(['category' => 'لا يمكن حذف قسم به منتجات، انقل منتجاته لقسم آخر أولاً']);
        }

        $category->delete();

        if ($category->image_path) {
            Storage::disk('public')->delete($category->image_path);
        }

        return response()->noContent();
    }
}
