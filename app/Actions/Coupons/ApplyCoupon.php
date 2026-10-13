<?php

namespace App\Actions\Coupons;

use App\Enums\CouponType;
use App\Enums\OrderStatus;
use App\Models\Coupon;
use App\Models\Customer;
use App\Models\ProductVariant;
use App\Models\Store;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class ApplyCoupon
{
    /**
     * Checks a code against the customer's cart and works out the discount. Every rule that
     * fails is reported on `coupon_code` with the reason, so the shopper knows what to fix.
     * Pass $lock while placing the order so concurrent checkouts can't exceed the usage limit.
     *
     * @param  Collection<int, array{variant: ProductVariant, quantity: int}>  $lines  each variant with product loaded
     * @return array{coupon: Coupon, discount: float, free_shipping: bool, eligible_subtotal: float}
     *
     * @throws ValidationException
     */
    public function handle(Store $store, Customer $customer, string $code, Collection $lines, bool $lock = false): array
    {
        $coupon = $store->coupons()
            ->where('code', Coupon::normalize($code))
            ->when($lock, fn ($query) => $query->lockForUpdate())
            ->first();

        $fail = fn (string $key, array $replace = []) => throw ValidationException::withMessages(['coupon_code' => __("coupons.{$key}", $replace)]);

        if (! $coupon || ! $coupon->is_active) {
            $fail('invalid');
        }

        if ($coupon->starts_at?->isFuture()) {
            $fail('not_started', ['date' => $coupon->starts_at->translatedFormat('j F Y')]);
        }

        if ($coupon->ends_at?->isPast()) {
            $fail('expired');
        }

        if ($coupon->usage_limit !== null && $coupon->uses()->count() >= $coupon->usage_limit) {
            $fail('used_up');
        }

        if ($coupon->affiliate && $coupon->affiliate->phone === $customer->phone) {
            $fail('own_affiliate_coupon');
        }

        $customerOrders = $customer->orders()->where('status', '!=', OrderStatus::Cancelled);

        if ($coupon->first_order_only && (clone $customerOrders)->exists()) {
            $fail('first_order_only');
        }

        if ($coupon->per_customer_limit !== null && (clone $customerOrders)->where('coupon_id', $coupon->id)->count() >= $coupon->per_customer_limit) {
            $fail('customer_limit');
        }

        $subtotal = round($lines->sum(fn (array $line): float => $line['variant']->price * $line['quantity']), 2);

        if ($coupon->min_subtotal !== null && $subtotal < $coupon->min_subtotal) {
            $fail('min_subtotal', ['amount' => number_format($coupon->min_subtotal, 2), 'remaining' => number_format($coupon->min_subtotal - $subtotal, 2)]);
        }

        $eligible = round($lines
            ->filter(fn (array $line): bool => $coupon->appliesTo($line['variant']->product_id, $line['variant']->product->category_id))
            ->sum(fn (array $line): float => $line['variant']->price * $line['quantity']), 2);

        if ($eligible <= 0) {
            $fail('not_applicable');
        }

        $discount = match ($coupon->type) {
            CouponType::Percentage => min(round($eligible * $coupon->value / 100, 2), $coupon->max_discount ?? PHP_FLOAT_MAX),
            CouponType::Fixed => min($coupon->value, $eligible),
            CouponType::FreeShipping => 0.0,
        };

        return ['coupon' => $coupon, 'discount' => round($discount, 2), 'free_shipping' => $coupon->isFreeShipping(), 'eligible_subtotal' => $eligible];
    }
}
