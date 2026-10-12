<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Actions\Affiliates\CreateAffiliate;
use App\Enums\AffiliateSource;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Vendor\ListAffiliatesRequest;
use App\Http\Requests\Api\V1\Vendor\StoreAffiliateRequest;
use App\Http\Requests\Api\V1\Vendor\UpdateAffiliateRequest;
use App\Http\Resources\AffiliateResource;
use App\Models\Affiliate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

class AffiliateController extends Controller
{
    /**
     * The vendor's affiliates, newest first, filtered and paginated.
     */
    public function index(ListAffiliatesRequest $request): AnonymousResourceCollection
    {
        $filters = $request->validated();

        $affiliates = $request->user()->store->affiliates()
            ->with('referralCodes.store')
            ->search($filters['search'] ?? null)
            ->when($filters['tier'] ?? null, fn ($query, $tier) => $query->where('tier', $tier))
            ->when($filters['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->when($filters['payout_method'] ?? null, fn ($query, $method) => $query->where('payout_type', $method))
            ->when($request->boolean('payout_request'), fn ($query) => $query->has('pendingPayoutRequest'))
            ->latest()
            ->latest('id')
            ->paginate($filters['per_page'] ?? 10)
            ->withQueryString();

        return AffiliateResource::collection($affiliates);
    }

    /**
     * Manually add a single affiliate; an active referral code is generated automatically.
     */
    public function store(StoreAffiliateRequest $request, CreateAffiliate $createAffiliate): JsonResponse
    {
        $affiliate = $createAffiliate->handle(
            $request->user()->store,
            $request->safe()->except(['avatar', 'password_confirmation']),
            AffiliateSource::Manual,
            avatar: $request->file('avatar'),
        );

        return (new AffiliateResource($affiliate->load('referralCodes.store')))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Affiliate $affiliate): AffiliateResource
    {
        Gate::authorize('view', $affiliate);

        return new AffiliateResource($affiliate->load('referralCodes.store'));
    }

    /**
     * Edit details. A blank password keeps the current one.
     */
    public function update(UpdateAffiliateRequest $request, Affiliate $affiliate): AffiliateResource
    {
        $validated = $request->validated();
        $previousAvatar = $affiliate->avatar_path;

        $affiliate->fill([
            'full_name' => $validated['full_name'],
            'phone' => $validated['phone'],
            'email' => $validated['email'] ?? null,
            'tier' => $validated['tier'],
            'payout_type' => $validated['payout_method']['type'],
            'payout_account_name' => $validated['payout_method']['account_name'],
            'payout_account_number' => $validated['payout_method']['account_number'],
            'payout_bank_name' => $validated['payout_method']['bank_name'] ?? null,
            'payout_iban' => $validated['payout_method']['iban'] ?? null,
        ]);

        if (filled($validated['password'] ?? null)) {
            $affiliate->password = $validated['password'];
        }

        if ($request->hasFile('avatar')) {
            $affiliate->avatar_path = $request->file('avatar')->store('affiliates/avatars', 'public');
        } elseif ($request->boolean('remove_avatar')) {
            $affiliate->avatar_path = null;
        }

        $affiliate->save();

        if ($previousAvatar && $previousAvatar !== $affiliate->avatar_path) {
            Storage::disk('public')->delete($previousAvatar);
        }

        return new AffiliateResource($affiliate->load('referralCodes.store'));
    }

    /**
     * Permanent delete. Referral codes cascade; use freezing to keep history instead.
     */
    public function destroy(Affiliate $affiliate): Response
    {
        Gate::authorize('delete', $affiliate);

        $affiliate->tokens()->delete();
        $affiliate->delete();

        if ($affiliate->avatar_path) {
            Storage::disk('public')->delete($affiliate->avatar_path);
        }

        return response()->noContent();
    }
}
