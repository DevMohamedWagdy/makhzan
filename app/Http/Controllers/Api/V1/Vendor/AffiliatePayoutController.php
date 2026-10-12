<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Enums\PayoutStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Vendor\RejectAffiliatePayoutRequest;
use App\Http\Requests\Api\V1\Vendor\StoreAffiliatePayoutRequest;
use App\Http\Resources\AffiliatePayoutResource;
use App\Http\Resources\AffiliateResource;
use App\Models\Affiliate;
use App\Models\AffiliatePayout;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class AffiliatePayoutController extends Controller
{
    /**
     * The affiliate's payouts and transfer requests, newest first, with the total paid.
     */
    public function index(Affiliate $affiliate): AnonymousResourceCollection
    {
        Gate::authorize('view', $affiliate);

        return AffiliatePayoutResource::collection($affiliate->payouts()->latest('id')->paginate(20))
            ->additional(['summary' => ['total_paid' => (float) $affiliate->payouts()->where('status', PayoutStatus::Paid)->sum('amount')]]);
    }

    /**
     * Record a payment sent outside the app; fulfils the open transfer request, if any.
     * Returns the affiliate with the reduced pending balance.
     */
    public function store(StoreAffiliatePayoutRequest $request, Affiliate $affiliate): JsonResponse
    {
        $affiliate->recordPayout(
            (float) $request->validated('amount'),
            $request->validated('reference'),
            $request->validated('note'),
            $request->filled('paid_at') ? Date::parse($request->validated('paid_at')) : null,
        );

        return (new AffiliateResource($affiliate->refresh()->load('referralCodes.store')))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    /**
     * Decline an open transfer request; the pending balance stays as it is.
     */
    public function reject(RejectAffiliatePayoutRequest $request, Affiliate $affiliate, AffiliatePayout $payout): AffiliateResource
    {
        if ($payout->status !== PayoutStatus::Requested) {
            throw ValidationException::withMessages(['payout' => __('payouts.already_processed')]);
        }

        $payout->reject($request->validated('note'));

        return new AffiliateResource($affiliate->refresh()->load('referralCodes.store'));
    }
}
