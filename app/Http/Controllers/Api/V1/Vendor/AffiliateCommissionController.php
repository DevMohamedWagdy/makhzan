<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Enums\CommissionType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Vendor\UpdateAffiliateCommissionRequest;
use App\Http\Resources\AffiliateResource;
use App\Models\Affiliate;

class AffiliateCommissionController extends Controller
{
    /**
     * Set a custom commission for one affiliate, or revert to the tier default.
     */
    public function __invoke(UpdateAffiliateCommissionRequest $request, Affiliate $affiliate): AffiliateResource
    {
        if ($request->boolean('use_tier_default')) {
            $affiliate->setCommissionOverride(null);
        } else {
            $affiliate->setCommissionOverride(
                $request->enum('type', CommissionType::class),
                (float) $request->validated('value'),
                $request->validated('note'),
            );
        }

        return new AffiliateResource($affiliate->load('referralCodes.store'));
    }
}
