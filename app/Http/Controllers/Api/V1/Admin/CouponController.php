<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminCouponResource;
use App\Models\Coupon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

/**
 * Discount codes of every store, with how often each was used.
 */
class CouponController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'store_id' => ['nullable', 'integer'],
            'state' => ['nullable', Rule::in(['active', 'scheduled', 'expired', 'disabled'])],
            'search' => ['nullable', 'string', 'max:32'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);
        $search = Coupon::normalize($filters['search'] ?? '');

        $coupons = Coupon::query()
            ->withUsageStats()
            ->with(['store', 'affiliate'])
            ->inState($filters['state'] ?? null)
            ->when($filters['store_id'] ?? null, fn ($query, int $storeId) => $query->where('store_id', $storeId))
            ->when($search !== '', fn ($query) => $query->where('code', 'like', "%{$search}%"))
            ->latest('id')
            ->paginate(30)
            ->withQueryString();

        return AdminCouponResource::collection($coupons);
    }
}
