<?php

namespace App\Http\Resources;

use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A product as shoppers see it: a card for listings, or the full product page with
 * ->detailed(). Exact stock is never exposed; only "N left" once it runs low.
 *
 * @mixin Product
 */
class StorefrontProductResource extends JsonResource
{
    private bool $detailed = false;

    /**
     * Include description, options, all images and per-variant availability.
     */
    public function detailed(): static
    {
        $this->detailed = true;

        return $this;
    }

    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $variants = $this->variants;
        $cheapest = $variants->sortBy('price')->first();
        $images = $this->images;

        return [
            'product_id' => $this->id,
            'name' => $this->translated('name'),
            'slug' => $this->slug,
            'category' => ['name' => $this->category->translated('name'), 'slug' => $this->category->slug],
            'image_url' => $images->first()?->url,
            'hover_image_url' => $images->get(1)?->url,
            'price' => $cheapest?->price,
            'price_max' => $variants->max('price'),
            'compare_at_price' => $cheapest?->compare_at_price,
            'discount_percent' => $cheapest?->compare_at_price ? (int) round((1 - $cheapest->price / $cheapest->compare_at_price) * 100) : null,
            'in_stock' => $variants->contains(fn (ProductVariant $variant): bool => $variant->stock > 0),
            'is_featured' => $this->is_featured,
            'rating_average' => $this->rating_average,
            'reviews_count' => $this->reviews_count,
            $this->mergeWhen($this->detailed, fn (): array => [
                'description' => $this->translated('description'),
                'options' => $this->options ?? [],
                'images' => $images->map(fn ($image): array => ['url' => $image->url])->values(),
                'variants' => $variants->map(fn (ProductVariant $variant): array => [
                    'variant_id' => $variant->id,
                    'option_values' => $variant->option_values,
                    'price' => $variant->price,
                    'compare_at_price' => $variant->compare_at_price,
                    'available' => $variant->stock > 0,
                    'stock_left' => $variant->stock > 0 && $variant->stock <= ($request->route('store')?->low_stock_threshold ?? config('makhzan.products.low_stock_threshold')) ? $variant->stock : null,
                ])->values(),
            ]),
        ];
    }
}
