<?php

namespace App\Http\Resources;

use App\Models\LoyaltyTransaction;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin LoyaltyTransaction
 */
class LoyaltyTransactionResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'transaction_id' => $this->id,
            'type' => $this->type,
            'points' => $this->points,
            'balance_after' => $this->balance_after,
            'order_number' => $this->whenLoaded('order', fn (): ?int => $this->order?->number),
            'note' => $this->note,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
