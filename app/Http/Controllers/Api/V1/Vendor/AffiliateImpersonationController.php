<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Enums\AffiliateStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\AffiliateResource;
use App\Models\Affiliate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class AffiliateImpersonationController extends Controller
{
    /**
     * "Login as affiliate": issues a short-lived affiliate token for the vendor's support use.
     * The vendor's own token is untouched, and every start is written to the log for audit.
     */
    public function store(Request $request, Affiliate $affiliate): JsonResponse
    {
        Gate::authorize('impersonate', $affiliate);

        if ($affiliate->status === AffiliateStatus::Pending) {
            throw ValidationException::withMessages(['affiliate' => 'لا يمكن الدخول بحساب مسوق لم تتم الموافقة عليه بعد']);
        }

        $vendor = $request->user();
        $expiresAt = now()->addMinutes(config('makhzan.affiliates.impersonation_minutes'));
        $token = $affiliate->createToken("impersonation:vendor-{$vendor->id}", [Affiliate::IMPERSONATION_ABILITY], $expiresAt);

        Log::info('Vendor started affiliate impersonation', [
            'vendor_id' => $vendor->id,
            'affiliate_id' => $affiliate->id,
            'store_id' => $affiliate->store_id,
            'token_id' => $token->accessToken->id,
            'expires_at' => $expiresAt->toIso8601String(),
        ]);

        return response()->json([
            'token' => $token->plainTextToken,
            'expires_at' => $expiresAt->toIso8601String(),
            'affiliate' => new AffiliateResource($affiliate->load('referralCodes.store')),
        ]);
    }
}
