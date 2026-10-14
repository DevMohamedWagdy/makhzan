<?php

namespace App\Http\Resources;

use App\Models\SubscriptionPayment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin SubscriptionPayment
 */
class SubscriptionPaymentResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'payment_id' => $this->id,
            'plan_name' => $this->plan_name,
            'store' => $this->whenLoaded('store', fn (): array => ['store_id' => $this->store->id, 'name' => $this->store->name, 'slug' => $this->store->slug]),
            'amount' => $this->amount,
            'months' => $this->months,
            'method' => $this->method,
            'reference' => $this->reference,
            'starts_at' => $this->starts_at?->toIso8601String(),
            'ends_at' => $this->ends_at?->toIso8601String(),
            'recorded_by' => $this->whenLoaded('recorder', fn (): ?string => $this->recorder?->full_name),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
