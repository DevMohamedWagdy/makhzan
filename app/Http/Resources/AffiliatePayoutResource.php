<?php

namespace App\Http\Resources;

use App\Models\AffiliatePayout;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Shared by the vendor and the affiliate: every field is meant for both sides. The nested
 * affiliate is only loaded on vendor endpoints.
 *
 * @mixin AffiliatePayout
 */
class AffiliatePayoutResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'payout_id' => $this->id,
            'affiliate_id' => $this->affiliate_id,
            'amount' => $this->amount,
            'status' => $this->status,
            'payout_method' => [
                'type' => $this->payout_type,
                'account_name' => $this->payout_account_name,
                'account_number_last4' => $this->payout_account_last4,
            ],
            'reference' => $this->reference,
            'request_note' => $this->request_note,
            'note' => $this->note,
            'created_at' => $this->created_at?->toIso8601String(),
            'paid_at' => $this->paid_at?->toIso8601String(),
            'rejected_at' => $this->rejected_at?->toIso8601String(),
            'affiliate' => new AffiliateResource($this->whenLoaded('affiliate')),
        ];
    }
}
