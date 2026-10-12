<?php

namespace App\Http\Resources;

use App\Models\AffiliateReferralCode;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin AffiliateReferralCode
 */
class ReferralCodeResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'referral_code_id' => $this->id,
            'code' => $this->code,
            'url' => $this->store->storefrontUrl('?ref='.$this->code),
            'clicks' => $this->clicks,
            'orders' => $this->orders,
            'is_active' => $this->is_active,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
