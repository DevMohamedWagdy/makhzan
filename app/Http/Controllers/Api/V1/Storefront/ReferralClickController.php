<?php

namespace App\Http\Controllers\Api\V1\Storefront;

use App\Enums\AffiliateStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Storefront\RecordReferralClickRequest;
use App\Models\AffiliateReferralCode;
use App\Models\Store;
use Illuminate\Http\JsonResponse;

class ReferralClickController extends Controller
{
    /**
     * Counts a visit through an affiliate's link (?ref=CODE). The SPA keeps the code for
     * 30 days so a later order is credited to the affiliate (last click wins).
     */
    public function __invoke(RecordReferralClickRequest $request, Store $store): JsonResponse
    {
        $referralCode = $store->affiliates()
            ->where('status', AffiliateStatus::Active)
            ->join('affiliate_referral_codes', 'affiliate_referral_codes.affiliate_id', '=', 'affiliates.id')
            ->where('affiliate_referral_codes.is_active', true)
            ->where('affiliate_referral_codes.code', $request->validated('code'))
            ->value('affiliate_referral_codes.id');

        if ($referralCode) {
            AffiliateReferralCode::query()->whereKey($referralCode)->increment('clicks');
        }

        return response()->json(['valid' => (bool) $referralCode]);
    }
}
