<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Enums\AffiliateStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Vendor\UpdateAffiliateStatusRequest;
use App\Http\Resources\AffiliateResource;
use App\Models\Affiliate;
use App\Notifications\AffiliateAccountStatusNotification;

class AffiliateStatusController extends Controller
{
    /**
     * Freeze (suspend, keeping history) or activate / approve an affiliate, who is told
     * about the change by email and in the portal.
     */
    public function __invoke(UpdateAffiliateStatusRequest $request, Affiliate $affiliate): AffiliateResource
    {
        $previous = $affiliate->status;
        $reason = $request->validated('reason');

        if ($request->enum('status', AffiliateStatus::class) === AffiliateStatus::Frozen) {
            $affiliate->freeze($reason);
        } else {
            $affiliate->activate();
        }

        $event = match (true) {
            $previous === $affiliate->status => null,
            $affiliate->status === AffiliateStatus::Frozen => AffiliateAccountStatusNotification::FROZEN,
            $previous === AffiliateStatus::Pending => AffiliateAccountStatusNotification::APPROVED,
            default => AffiliateAccountStatusNotification::REACTIVATED,
        };

        if ($event) {
            $affiliate->notify(AffiliateAccountStatusNotification::for($affiliate, $event, $event === AffiliateAccountStatusNotification::FROZEN ? $reason : null));
        }

        return new AffiliateResource($affiliate->load('referralCodes.store'));
    }
}
