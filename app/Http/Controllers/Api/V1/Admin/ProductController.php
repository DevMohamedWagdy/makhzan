<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\ProductStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\AdminProductResource;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

/**
 * Products of every store, with their variants, stock and images.
 */
class ProductController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'store_id' => ['nullable', 'integer'],
            'status' => ['nullable', Rule::enum(ProductStatus::class)],
            'stock' => ['nullable', Rule::in(['in', 'low', 'out'])],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $products = Product::query()
            ->with(['store', 'category', 'variants', 'images'])
            ->search($filters['search'] ?? null)
            ->stockLevel($filters['stock'] ?? null)
            ->when($filters['store_id'] ?? null, fn ($query, int $storeId) => $query->where('store_id', $storeId))
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->latest('id')
            ->paginate(30)
            ->withQueryString();

        return AdminProductResource::collection($products);
    }

    public function show(Product $product): AdminProductResource
    {
        return new AdminProductResource($product->load(['store', 'category', 'variants', 'images']));
    }
}
