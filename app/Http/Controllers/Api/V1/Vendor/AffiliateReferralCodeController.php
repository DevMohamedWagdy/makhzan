<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Enums\AffiliateStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\AffiliateResource;
use App\Models\Affiliate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class AffiliateReferralCodeController extends Controller
{
    /**
     * Issue an additional referral code; returns the affiliate with all codes.
     */
    public function store(Affiliate $affiliate): JsonResponse
    {
        Gate::authorize('update', $affiliate);

        if ($affiliate->status !== AffiliateStatus::Active) {
            throw ValidationException::withMessages(['affiliate' => 'لا يمكن إنشاء كود لمسوق غير نشط']);
        }

        $affiliate->createReferralCode();

        return (new AffiliateResource($affiliate->load('referralCodes.store')))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }
}
