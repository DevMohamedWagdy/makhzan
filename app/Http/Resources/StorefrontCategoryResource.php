<?php

namespace App\Http\Resources;

use App\Models\ProductCategory;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A category as shoppers see it.
 *
 * @mixin ProductCategory
 */
class StorefrontCategoryResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'name' => $this->translated('name'),
            'slug' => $this->slug,
            'description' => $this->translated('description'),
            'image_url' => $this->image_url,
            'products_count' => $this->whenCounted('products'),
        ];
    }
}
