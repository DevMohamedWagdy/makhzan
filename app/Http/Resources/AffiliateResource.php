<?php

namespace App\Http\Resources;

use App\Models\Affiliate;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Affiliate
 */
class AffiliateResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'affiliate_id' => $this->id,
            'vendor_id' => $this->vendor_id,
            'store_id' => $this->store_id,
            'full_name' => $this->full_name,
            'phone' => $this->phone,
            'email' => $this->email,
            'avatar_url' => $this->avatar_url,
            'status' => $this->status,
            'tier' => $this->tier,
            'payout_method' => [
                'type' => $this->payout_type,
                'account_name' => $this->payout_account_name,
                'account_number' => $this->payout_account_number,
                'bank_name' => $this->payout_bank_name,
                'iban' => $this->payout_iban,
            ],
            'commission_override' => $this->commission_type ? [
                'type' => $this->commission_type,
                'value' => $this->commission_value,
                'note' => $this->commission_note,
            ] : null,
            'referral_codes' => ReferralCodeResource::collection($this->whenLoaded('referralCodes')),
            'stats' => [
                'orders_count' => $this->orders_count,
                'sales_total' => $this->sales_total,
                'earned_commission' => $this->earned_commission,
                'pending_balance' => $this->pending_balance,
            ],
            'payout_request' => $this->pendingPayoutRequest ? new AffiliatePayoutResource($this->pendingPayoutRequest) : null,
            'source' => $this->source,
            'frozen_reason' => $this->frozen_reason,
            'joined_at' => $this->created_at?->toIso8601String(),
            'last_active_at' => $this->last_active_at?->toIso8601String(),
        ];
    }
}
