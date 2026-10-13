<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Vendor\SaveCouponRequest;
use App\Http\Resources\CouponResource;
use App\Models\Coupon;
use App\Models\Store;
use App\Notifications\AffiliateCouponNotification;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CouponController extends Controller
{
    /**
     * The store's coupons, newest first, by state or code, with their stats and state counts.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'state' => ['nullable', Rule::in(['active', 'scheduled', 'expired', 'disabled'])],
            'search' => ['nullable', 'string', 'max:32'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);
        $store = $request->user()->store;
        $search = Coupon::normalize($filters['search'] ?? '');

        $coupons = $this->withStats($store->coupons())
            ->with(['affiliate', 'store'])
            ->inState($filters['state'] ?? null)
            ->when($search !== '', fn ($query) => $query->where('code', 'like', "%{$search}%"))
            ->latest('id')
            ->paginate(20)
            ->withQueryString();

        $totals = $store->orders()->toBase()
            ->whereNotNull('coupon_id')
            ->where('status', '!=', OrderStatus::Cancelled->value)
            ->selectRaw('count(*) as orders, coalesce(sum(discount + shipping_discount), 0) as discounts')
            ->first();

        return CouponResource::collection($coupons)->additional(['summary' => [
            ...collect(['active', 'scheduled', 'expired', 'disabled'])->mapWithKeys(fn (string $state): array => [$state => $store->coupons()->inState($state)->count()]),
            'total' => $store->coupons()->count(),
            'orders' => (int) $totals->orders,
            'discounts' => round((float) $totals->discounts, 2),
        ]]);
    }

    public function store(SaveCouponRequest $request): JsonResponse
    {
        $coupon = $request->user()->store->coupons()->create($request->couponAttributes());
        $this->notifyAffiliate($coupon);

        return (new CouponResource($this->fresh($coupon)))->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Coupon $coupon): CouponResource
    {
        Gate::authorize('view', $coupon);

        return new CouponResource($this->fresh($coupon));
    }

    public function update(SaveCouponRequest $request, Coupon $coupon): CouponResource
    {
        $previousAffiliate = $coupon->affiliate_id;
        $coupon->update($request->couponAttributes());

        if ($coupon->affiliate_id !== $previousAffiliate) {
            $this->notifyAffiliate($coupon);
        }

        return new CouponResource($this->fresh($coupon));
    }

    /**
     * Turn a coupon on or off without changing anything else.
     */
    public function updateStatus(Request $request, Coupon $coupon): CouponResource
    {
        Gate::authorize('update', $coupon);

        $coupon->update($request->validate(['is_active' => ['required', 'boolean']]));

        return new CouponResource($this->fresh($coupon));
    }

    /**
     * Only a coupon no order used can be deleted; used ones are disabled to keep the history.
     */
    public function destroy(Coupon $coupon): Response
    {
        Gate::authorize('delete', $coupon);

        if ($coupon->orders()->exists()) {
            throw ValidationException::withMessages(['coupon' => __('coupons.used_cannot_delete')]);
        }

        $coupon->delete();

        return response()->noContent();
    }

    /**
     * Uses, discount given and sales from orders that weren't cancelled.
     *
     * @param  Builder<Coupon>|HasMany<Coupon, Store>  $query
     * @return Builder<Coupon>|HasMany<Coupon, Store>
     */
    private function withStats(Builder|HasMany $query): Builder|HasMany
    {
        $notCancelled = fn ($query) => $query->where('status', '!=', OrderStatus::Cancelled);

        return $query
            ->withCount(['orders as uses_count' => $notCancelled])
            ->withSum(['orders as discount_total' => $notCancelled], 'discount')
            ->withSum(['orders as shipping_discount_total' => $notCancelled], 'shipping_discount')
            ->withSum(['orders as sales_total' => $notCancelled], 'total');
    }

    /**
     * Tells the affiliate a coupon now credits its orders to them (active coupons only).
     */
    private function notifyAffiliate(Coupon $coupon): void
    {
        if ($coupon->is_active && $coupon->affiliate) {
            $coupon->affiliate->notify(new AffiliateCouponNotification($coupon));
        }
    }

    private function fresh(Coupon $coupon): Coupon
    {
        return $this->withStats(Coupon::query()->whereKey($coupon->id))->with(['affiliate', 'store'])->firstOrFail();
    }
}
