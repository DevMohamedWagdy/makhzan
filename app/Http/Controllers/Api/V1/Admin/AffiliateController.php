<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Actions\Affiliates\ChangeAffiliateStatus;
use App\Enums\AffiliateStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\AdminAffiliateResource;
use App\Http\Resources\AdminOrderResource;
use App\Http\Resources\AffiliatePayoutResource;
use App\Models\Affiliate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

/**
 * Affiliates (marketers) of every store: list, profile with orders and payouts, and
 * freezing or reactivating an account.
 */
class AffiliateController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'store_id' => ['nullable', 'integer'],
            'status' => ['nullable', Rule::enum(AffiliateStatus::class)],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $affiliates = Affiliate::query()
            ->with(['store', 'referralCodes.store'])
            ->search($filters['search'] ?? null)
            ->when($filters['store_id'] ?? null, fn ($query, int $storeId) => $query->where('store_id', $storeId))
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->latest('id')
            ->paginate(30)
            ->withQueryString();

        return AdminAffiliateResource::collection($affiliates);
    }

    public function show(Affiliate $affiliate): JsonResponse
    {
        $affiliate->load(['store', 'referralCodes.store']);

        return response()->json([
            'data' => new AdminAffiliateResource($affiliate),
            'orders' => AdminOrderResource::collection($affiliate->orders()->with('store')->withCount('items')->latest('id')->limit(20)->get()),
            'payouts' => AffiliatePayoutResource::collection($affiliate->payouts()->latest('id')->limit(20)->get()),
        ]);
    }

    public function updateStatus(Request $request, Affiliate $affiliate, ChangeAffiliateStatus $changeStatus): AdminAffiliateResource
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in([AffiliateStatus::Active->value, AffiliateStatus::Frozen->value])],
            'reason' => ['nullable', 'string', 'max:200'],
        ]);

        $changeStatus->handle($affiliate, AffiliateStatus::from($validated['status']), $validated['reason'] ?? null);

        return new AdminAffiliateResource($affiliate->load(['store', 'referralCodes.store']));
    }
}
