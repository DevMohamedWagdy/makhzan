<?php

namespace App\Http\Resources;

use App\Models\SubscriptionRequest;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin SubscriptionRequest
 */
class SubscriptionRequestResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'request_id' => $this->id,
            'plan' => new PlanResource($this->whenLoaded('plan')),
            'store' => $this->whenLoaded('store', fn (): array => ['store_id' => $this->store->id, 'name' => $this->store->name, 'slug' => $this->store->slug]),
            'months' => $this->months,
            'amount' => $this->amount,
            'method' => $this->method,
            'reference' => $this->reference,
            'notes' => $this->notes,
            'status' => $this->status,
            'review_note' => $this->review_note,
            'reviewed_at' => $this->reviewed_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
