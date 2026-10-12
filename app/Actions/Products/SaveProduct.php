<?php

namespace App\Actions\Products;

use App\Models\Product;
use App\Models\Store;
use Illuminate\Support\Facades\DB;

class SaveProduct
{
    /**
     * Creates the product, or updates it, and syncs its variants: rows sent with an id are
     * updated, new rows are created and variants missing from the payload are deleted.
     *
     * @param  array{category_id: int, name: string, description?: string|null, status: string, is_featured?: bool, options: array<int, array{name: string, values: list<string>}>, variants: array<int, array{id?: int|null, option_values: list<string>, price: float|string, compare_at_price?: float|string|null, sku?: string|null, stock: int}>}  $data
     */
    public function handle(Store $store, array $data, ?Product $product = null): Product
    {
        return DB::transaction(function () use ($store, $data, $product): Product {
            $product ??= $store->products()->make(['slug' => Product::uniqueSlug($store->id, $data['name'])]);

            $product->fill([
                'category_id' => $data['category_id'],
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'status' => $data['status'],
                'is_featured' => $data['is_featured'] ?? false,
                'options' => array_values($data['options']),
            ])->save();

            $keptIds = collect($data['variants'])->pluck('id')->filter()->all();
            $product->variants()->whereKeyNot($keptIds)->delete();

            foreach (array_values($data['variants']) as $position => $variant) {
                $attributes = [
                    'option_values' => array_values($variant['option_values']),
                    'sku' => $variant['sku'] ?? null,
                    'price' => $variant['price'],
                    'compare_at_price' => $variant['compare_at_price'] ?? null,
                    'stock' => $variant['stock'],
                    'position' => $position,
                ];

                isset($variant['id'])
                    ? $product->variants()->findOrFail($variant['id'])->update($attributes)
                    : $product->variants()->create($attributes);
            }

            return $product->load(['category', 'variants', 'images']);
        });
    }
}
