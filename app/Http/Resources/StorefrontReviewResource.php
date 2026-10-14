<?php

namespace App\Http\Resources;

use App\Models\ProductReview;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A review as shoppers see it: the reviewer's first name only, and the store's reply.
 *
 * @mixin ProductReview
 */
class StorefrontReviewResource extends JsonResource
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
            'customer_name' => $this->publicName(),
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
