<?php

namespace App\Http\Resources;

use App\Models\ProductReview;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A review in the vendor dashboard, with the product and the order it was bought in.
 *
 * @mixin ProductReview
 */
class ProductReviewResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'review_id' => $this->id,
            'product' => $this->whenLoaded('product', fn (): array => [
                'product_id' => $this->product->id,
                'name' => $this->product->name,
                'slug' => $this->product->slug,
                'image_url' => $this->product->images->first()?->url,
            ]),
            'customer_id' => $this->customer_id,
            'customer_name' => $this->customer_name,
            'order_id' => $this->order_id,
            'order_number' => $this->whenLoaded('order', fn (): ?int => $this->order?->number),
            'rating' => $this->rating,
            'body' => $this->body,
            'image_urls' => $this->image_urls,
            'status' => $this->status,
            'reply' => $this->reply,
            'replied_at' => $this->replied_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
