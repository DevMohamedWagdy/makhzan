<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Enums\PayoutStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Vendor\ListPayoutsRequest;
use App\Http\Resources\AffiliatePayoutResource;
use App\Models\AffiliatePayout;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PayoutController extends Controller
{
    /**
     * Every payout and transfer request across the vendor's store, newest first, each with its
     * affiliate, plus per-status counts for the page tabs.
     */
    public function index(ListPayoutsRequest $request): AnonymousResourceCollection
    {
        $storeId = $request->user()->store->id;

        $payouts = AffiliatePayout::query()
            ->where('store_id', $storeId)
            ->when($request->validated('status'), fn ($query, $status) => $query->where('status', $status))
            ->with('affiliate')
            ->latest('id')
            ->paginate(20)
            ->withQueryString();

        $counts = AffiliatePayout::query()
            ->where('store_id', $storeId)
            ->toBase()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        return AffiliatePayoutResource::collection($payouts)->additional(['summary' => [
            'requested' => (int) ($counts[PayoutStatus::Requested->value] ?? 0),
            'paid' => (int) ($counts[PayoutStatus::Paid->value] ?? 0),
            'rejected' => (int) ($counts[PayoutStatus::Rejected->value] ?? 0),
        ]]);
    }
}
