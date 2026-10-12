<?php

namespace App\Http\Controllers\Api\V1\Affiliate;

use App\Enums\PayoutStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Affiliate\RequestPayoutRequest;
use App\Http\Resources\AffiliatePayoutResource;
use App\Notifications\AffiliatePayoutRequestedNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class PayoutController extends Controller
{
    /**
     * The affiliate's own payouts and transfer requests, newest first, with the total received.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $affiliate = $request->user();

        return AffiliatePayoutResource::collection($affiliate->payouts()->latest('id')->paginate(20))
            ->additional(['summary' => ['total_paid' => (float) $affiliate->payouts()->where('status', PayoutStatus::Paid)->sum('amount')]]);
    }

    /**
     * Ask the vendor to transfer commission from the pending balance; the vendor is emailed.
     */
    public function store(RequestPayoutRequest $request): JsonResponse
    {
        $affiliate = $request->user();
        $payout = $affiliate->requestPayout((float) $request->validated('amount'), $request->validated('note'));

        $affiliate->vendor->notify(new AffiliatePayoutRequestedNotification($payout));

        return (new AffiliatePayoutResource($payout))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }
}
