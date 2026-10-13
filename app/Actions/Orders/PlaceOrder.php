<?php

namespace App\Actions\Orders;

use App\Actions\Coupons\ApplyCoupon;
use App\Actions\Inventory\ChangeStock;
use App\Enums\AffiliateStatus;
use App\Enums\CommissionStatus;
use App\Enums\CommissionType;
use App\Enums\OrderStatus;
use App\Models\Affiliate;
use App\Models\AffiliateReferralCode;
use App\Models\Coupon;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderEvent;
use App\Models\ProductVariant;
use App\Models\Store;
use App\Notifications\AffiliateCommissionNotification;
use App\Notifications\OrderPlacedNotification;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PlaceOrder
{
    public function __construct(private ChangeStock $changeStock, private ApplyCoupon $applyCoupon) {}

    /**
     * Places a cash-on-delivery order. Variant rows are locked while stock is checked and
     * deducted, so two shoppers can't buy the last piece twice. A coupon is checked (and its
     * row locked, so its usage limit holds) and taken off the products or the shipping. The
     * order is attributed to the coupon's affiliate if it has one, otherwise to the referral
     * code's, with the commission in effect right now on the products after the discount.
     *
     * @param  list<array{variant_id: int, quantity: int}>  $items
     * @param  array{recipient_name: string, phone: string, governorate_id: string, city_id: string, address_line: string, landmark?: string|null}  $address
     *
     * @throws ValidationException
     */
    public function handle(Store $store, Customer $customer, array $items, array $address, ?string $referralCode = null, ?string $note = null, ?string $couponCode = null): Order
    {
        $quantities = collect($items)->groupBy('variant_id')->map(fn (Collection $lines): int => $lines->sum('quantity'));

        $order = DB::transaction(function () use ($store, $customer, $quantities, $address, $referralCode, $note, $couponCode): Order {
            // Serializes order numbers within the store (and reads its current settings).
            $store = Store::query()->whereKey($store->id)->lockForUpdate()->first();

            if (! $store->accepting_orders) {
                throw ValidationException::withMessages(['store' => $store->closed_message ?: __('settings.store_closed')]);
            }

            $variants = ProductVariant::query()
                ->whereIn('id', $quantities->keys())
                ->whereHas('product', fn ($query) => $query->where('store_id', $store->id)->visibleInStore())
                ->with(['product.images', 'product.store'])
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            $this->assertAvailable($quantities, $variants);

            $subtotal = round($quantities->sum(fn (int $quantity, int $variantId): float => $variants[$variantId]->price * $quantity), 2);

            if ($store->min_order_total !== null && $subtotal < $store->min_order_total) {
                throw ValidationException::withMessages(['items' => __('settings.min_order_total', [
                    'amount' => number_format($store->min_order_total, 2),
                    'remaining' => number_format($store->min_order_total - $subtotal, 2),
                ])]);
            }
            $shippingFee = $store->shippingFeeFor($address['governorate_id'], $subtotal)
                ?? throw ValidationException::withMessages(['address.governorate_id' => __('orders.no_delivery')]);

            $coupon = filled($couponCode)
                ? $this->applyCoupon->handle($store, $customer, $couponCode, $quantities->map(fn (int $quantity, int $variantId): array => ['variant' => $variants[$variantId], 'quantity' => $quantity])->values(), lock: true)
                : null;
            $discount = $coupon['discount'] ?? 0.0;
            $shippingDiscount = ($coupon['free_shipping'] ?? false) ? $shippingFee : 0.0;

            $order = $store->orders()->create([
                ...$address,
                ...$this->attribution($store, $customer, $referralCode, $subtotal - $discount, $coupon['coupon'] ?? null),
                'customer_id' => $customer->id,
                'number' => ((int) $store->orders()->max('number') ?: 1000) + 1,
                'status' => OrderStatus::Pending,
                'subtotal' => $subtotal,
                'discount' => $discount,
                'shipping_fee' => $shippingFee,
                'shipping_discount' => $shippingDiscount,
                'coupon_id' => $coupon['coupon']->id ?? null,
                'coupon_code' => $coupon['coupon']->code ?? null,
                'total' => round($subtotal - $discount + $shippingFee - $shippingDiscount, 2),
                'customer_note' => $note,
            ]);

            foreach ($quantities as $variantId => $quantity) {
                $variant = $variants[$variantId];

                $order->items()->create([
                    'product_id' => $variant->product_id,
                    'product_variant_id' => $variant->id,
                    'product_name' => $variant->product->name,
                    'variant_title' => $variant->title() ?: null,
                    'sku' => $variant->sku,
                    'image_path' => $variant->product->images->first()?->path,
                    'unit_price' => $variant->price,
                    'unit_cost' => $variant->cost,
                    'quantity' => $quantity,
                    'line_total' => round($variant->price * $quantity, 2),
                ]);

                $this->changeStock->sell($variant, $quantity, $order);
            }

            $order->events()->create(['status' => OrderStatus::Pending, 'actor' => OrderEvent::ACTOR_CUSTOMER]);
            $customer->forceFill(['last_order_at' => now()])->save();

            return $order;
        });

        $store->vendor->notify(new OrderPlacedNotification($order));
        $order->affiliate?->notify(new AffiliateCommissionNotification($order, AffiliateCommissionNotification::ORDER_PLACED));

        return $order;
    }

    /**
     * @param  Collection<int, int>  $quantities  variant id => quantity
     * @param  Collection<int, ProductVariant>  $variants
     *
     * @throws ValidationException
     */
    private function assertAvailable(Collection $quantities, Collection $variants): void
    {
        $errors = [];

        foreach ($quantities as $variantId => $quantity) {
            $variant = $variants->get($variantId);

            if (! $variant || $variant->stock === 0) {
                $errors["items.{$variantId}"] = __('orders.item_unavailable');
            } elseif ($variant->stock < $quantity) {
                $errors["items.{$variantId}"] = __('orders.item_insufficient', ['available' => $variant->stock]);
            }
        }

        if ($errors) {
            throw ValidationException::withMessages($errors);
        }
    }

    /**
     * Affiliate and commission for an order: the coupon's affiliate (the shopper typed their
     * code), else the referral code's. Referral codes that are unknown, disabled or belong to
     * the customer themselves are ignored, not rejected. Commission is on $base, the
     * products after any discount.
     *
     * @return array<string, mixed>
     */
    private function attribution(Store $store, Customer $customer, ?string $code, float $base, ?Coupon $coupon = null): array
    {
        if ($coupon?->affiliate?->status === AffiliateStatus::Active) {
            return [
                'affiliate_id' => $coupon->affiliate_id,
                'referral_code' => $coupon->code,
                ...$this->commission($coupon->affiliate, $base),
            ];
        }

        $referral = $code ? AffiliateReferralCode::query()
            ->where('store_id', $store->id)
            ->where('code', strtoupper(trim($code)))
            ->where('is_active', true)
            ->whereHas('affiliate', fn ($query) => $query->where('status', AffiliateStatus::Active))
            ->with('affiliate')
            ->first() : null;

        if (! $referral || $referral->affiliate->phone === $customer->phone) {
            return ['commission_status' => CommissionStatus::None];
        }

        return [
            'affiliate_id' => $referral->affiliate_id,
            'referral_code_id' => $referral->id,
            'referral_code' => $referral->code,
            ...$this->commission($referral->affiliate, $base),
        ];
    }

    /**
     * The affiliate's commission in effect now, on the given product total.
     *
     * @return array{commission_type: CommissionType, commission_rate: float, commission_amount: float, commission_status: CommissionStatus}
     */
    private function commission(Affiliate $affiliate, float $base): array
    {
        $commission = $affiliate->effectiveCommission();

        return [
            'commission_type' => $commission['type'],
            'commission_rate' => $commission['value'],
            'commission_amount' => $commission['type'] === CommissionType::Percentage ? round($base * $commission['value'] / 100, 2) : $commission['value'],
            'commission_status' => CommissionStatus::Pending,
        ];
    }
}
