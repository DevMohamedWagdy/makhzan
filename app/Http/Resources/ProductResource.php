<?php

namespace App\Http\Resources;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Vendor-facing product. Price range and total stock are derived from the loaded variants.
 *
 * @mixin Product
 */
class ProductResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $variants = $this->variants;
        $cheapest = $variants->sortBy('price')->first();

        return [
            'product_id' => $this->id,
            'name' => $this->name,
            'name_en' => $this->name_en,
            'slug' => $this->slug,
            'description' => $this->description,
            'description_en' => $this->description_en,
            'status' => $this->status,
            'is_featured' => $this->is_featured,
            'category' => $this->category ? ['category_id' => $this->category->id, 'name' => $this->category->name, 'name_en' => $this->category->name_en] : null,
            'options' => $this->options ?? [],
            'variants' => ProductVariantResource::collection($variants),
            'images' => ProductImageResource::collection($this->whenLoaded('images')),
            'image_url' => $this->relationLoaded('images') ? $this->images->first()?->url : null,
            'price' => $cheapest?->price,
            'price_max' => $variants->max('price'),
            'compare_at_price' => $cheapest?->compare_at_price,
            'stock_total' => (int) $variants->sum('stock'),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
