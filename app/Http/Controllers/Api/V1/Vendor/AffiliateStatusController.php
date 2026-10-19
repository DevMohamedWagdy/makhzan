<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Actions\Affiliates\ChangeAffiliateStatus;
use App\Enums\AffiliateStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Vendor\UpdateAffiliateStatusRequest;
use App\Http\Resources\AffiliateResource;
use App\Models\Affiliate;

class AffiliateStatusController extends Controller
{
    /**
     * Freeze (suspend, keeping history) or activate / approve an affiliate, who is told
     * about the change by email and in the portal.
     */
    public function __invoke(UpdateAffiliateStatusRequest $request, Affiliate $affiliate, ChangeAffiliateStatus $changeStatus): AffiliateResource
    {
        $changeStatus->handle($affiliate, $request->enum('status', AffiliateStatus::class), $request->validated('reason'));

        return new AffiliateResource($affiliate->load('referralCodes.store'));
    }
}
