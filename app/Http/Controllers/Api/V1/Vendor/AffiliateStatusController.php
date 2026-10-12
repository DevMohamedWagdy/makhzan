<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Enums\AffiliateStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Vendor\UpdateAffiliateStatusRequest;
use App\Http\Resources\AffiliateResource;
use App\Models\Affiliate;

class AffiliateStatusController extends Controller
{
    /**
     * Freeze (suspend, keeping history) or activate / approve an affiliate.
     */
    public function __invoke(UpdateAffiliateStatusRequest $request, Affiliate $affiliate): AffiliateResource
    {
        if ($request->enum('status', AffiliateStatus::class) === AffiliateStatus::Frozen) {
            $affiliate->freeze($request->validated('reason'));
        } else {
            $affiliate->activate();
        }

        return new AffiliateResource($affiliate->load('referralCodes.store'));
    }
}
