<?php

namespace App\Http\Controllers\Api\V1\Storefront\Customer;

use App\Actions\Coupons\ApplyCoupon;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Storefront\Customer\CheckCouponRequest;
use App\Models\ProductVariant;
use App\Models\Store;
use Illuminate\Http\JsonResponse;

class CouponController extends Controller
{
    /**
     * Checks a discount code against the shopper's cart at checkout: the discount on the
     * products, or free shipping. Unavailable cart items don't count. A rule that fails is
     * reported on coupon_code (422). The order checks the code again when it's placed.
     */
    public function __invoke(CheckCouponRequest $request, Store $store, ApplyCoupon $applyCoupon): JsonResponse
    {
        $items = collect($request->validated('items'));
        $variants = ProductVariant::query()
            ->whereIn('id', $items->pluck('variant_id'))
            ->whereHas('product', fn ($query) => $query->where('store_id', $store->id)->visibleInStore())
            ->with('product')
            ->get()
            ->keyBy('id');

        $lines = $items
            ->filter(fn (array $item): bool => $variants->has($item['variant_id']))
            ->map(fn (array $item): array => ['variant' => $variants[$item['variant_id']], 'quantity' => min($item['quantity'], $variants[$item['variant_id']]->stock)])
            ->filter(fn (array $line): bool => $line['quantity'] > 0)
            ->values();

        $result = $applyCoupon->handle($store, $request->user(), $request->validated('coupon_code'), $lines);
        $coupon = $result['coupon'];

        return response()->json([
            'code' => $coupon->code,
            'type' => $coupon->type,
            'value' => $coupon->value,
            'description' => $coupon->description,
            'discount' => $result['discount'],
            'free_shipping' => $result['free_shipping'],
        ]);
    }
}
