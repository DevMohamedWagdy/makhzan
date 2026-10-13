<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Vendor\ListInventoryRequest;
use App\Http\Requests\Api\V1\Vendor\UpdateInventoryItemRequest;
use App\Http\Resources\InventoryItemResource;
use App\Models\ProductVariant;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class InventoryController extends Controller
{
    /**
     * Every variant in the store with its stock level and value, searched, filtered and sorted.
     */
    public function index(ListInventoryRequest $request): AnonymousResourceCollection
    {
        $filters = $request->validated();
        $search = trim($filters['search'] ?? '');

        $variants = ProductVariant::query()
            ->inventoryOf($request->user()->store)
            ->with(['product.images', 'product.store.warehouses', 'warehouseStocks'])
            ->stockLevel($filters['level'] ?? null)
            ->when($search !== '', fn ($query) => $query->where(fn ($query) => $query
                ->where('products.name', 'like', "%{$search}%")
                ->orWhere('product_variants.sku', 'like', "%{$search}%")))
            ->when($filters['category_id'] ?? null, fn ($query, $categoryId) => $query->where('products.category_id', $categoryId))
            ->when($request->boolean('missing_cost'), fn ($query) => $query->whereNull('product_variants.cost'))
            ->when($filters['sort'] ?? 'name', fn ($query, string $sort) => match ($sort) {
                'stock_asc' => $query->orderBy('product_variants.stock'),
                'stock_desc' => $query->orderByDesc('product_variants.stock'),
                'value' => $query->orderByRaw('product_variants.stock * coalesce(product_variants.cost, product_variants.price) desc'),
                default => $query->orderBy('products.name')->orderBy('product_variants.position'),
            })
            ->orderBy('product_variants.id')
            ->paginate($filters['per_page'] ?? 20)
            ->withQueryString();

        return InventoryItemResource::collection($variants);
    }

    /**
     * Set the variant's cost and its own low-stock threshold (null uses the store's).
     */
    public function update(UpdateInventoryItemRequest $request, ProductVariant $variant): InventoryItemResource
    {
        $variant->update($request->validated());

        return new InventoryItemResource($variant->load(['product.images', 'product.store.warehouses', 'warehouseStocks']));
    }
}
