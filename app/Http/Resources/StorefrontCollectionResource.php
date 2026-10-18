<?php

namespace App\Http\Resources;

use App\Models\ProductCollection;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A collection as shoppers see it: a titled section of products on the home page.
 *
 * @mixin ProductCollection
 */
class StorefrontCollectionResource extends JsonResource
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
            'products' => StorefrontProductResource::collection($this->whenLoaded('products')),
        ];
    }
}
