<?php

namespace App\Http\Resources;

use App\Models\Affiliate;
use App\Models\Coupon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The affiliate's view of their own account. Unlike AffiliateResource (vendor-facing) it
 * omits vendor-internal data — the commission note, freeze reason, source — and only
 * exposes the last digits of payout accounts.
 *
 * @mixin Affiliate
 */
class AffiliateSelfResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $commission = $this->effectiveCommission();

        return [
            'affiliate_id' => $this->id,
            'full_name' => $this->full_name,
            'phone' => $this->phone,
            'email' => $this->email,
            'avatar_url' => $this->avatar_url,
            'status' => $this->status,
            'tier' => $this->tier,
            'commission' => ['type' => $commission['type'], 'value' => $commission['value']],
            'payout_method' => [
                'type' => $this->payout_type,
                'account_name' => $this->payout_account_name,
                'account_number_last4' => mb_substr((string) $this->payout_account_number, -4),
                'bank_name' => $this->payout_bank_name,
            ],
            'referral_codes' => ReferralCodeResource::collection($this->whenLoaded('referralCodes')),
            'coupons' => $this->whenLoaded('coupons', fn () => $this->coupons->map(fn (Coupon $coupon): array => [
                'code' => $coupon->code,
                'url' => $this->store->storefrontUrl('?coupon='.urlencode($coupon->code)),
                'type' => $coupon->type,
                'value' => $coupon->value,
                'max_discount' => $coupon->max_discount,
                'min_subtotal' => $coupon->min_subtotal,
                'ends_at' => $coupon->ends_at?->toIso8601String(),
            ])),
            'stats' => [
                'orders_count' => $this->orders_count,
                'sales_total' => $this->sales_total,
                'earned_commission' => $this->earned_commission,
                'pending_balance' => $this->pending_balance,
            ],
            'payout_request' => $this->pendingPayoutRequest ? new AffiliatePayoutResource($this->pendingPayoutRequest) : null,
            'store' => new PublicStoreResource($this->whenLoaded('store')),
            'joined_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
