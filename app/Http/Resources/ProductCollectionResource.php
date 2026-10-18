<?php

namespace App\Http\Resources;

use App\Models\Product;
use App\Models\ProductCollection;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ProductCollection
 */
class ProductCollectionResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'collection_id' => $this->id,
            'name' => $this->name,
            'name_en' => $this->name_en,
            'position' => $this->position,
            'is_active' => $this->is_active,
            'products_count' => $this->whenCounted('products'),
            'products' => $this->whenLoaded('products', fn () => $this->products->map(fn (Product $product): array => [
                'product_id' => $product->id,
                'name' => $product->name,
                'name_en' => $product->name_en,
                'status' => $product->status,
                'image_url' => $product->relationLoaded('images') ? $product->images->first()?->url : null,
                'price' => $product->relationLoaded('variants') ? $product->variants->min('price') : null,
            ])),
        ];
    }
}
