<?php

namespace App\Actions\Orders;

use App\Actions\Inventory\ChangeStock;
use App\Enums\AffiliateStatus;
use App\Enums\CommissionStatus;
use App\Enums\CommissionType;
use App\Enums\OrderStatus;
use App\Enums\StockMovementType;
use App\Models\AffiliateReferralCode;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderEvent;
use App\Models\ProductVariant;
use App\Models\StockMovement;
use App\Models\Store;
use App\Notifications\AffiliateCommissionNotification;
use App\Notifications\OrderPlacedNotification;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PlaceOrder
{
    public function __construct(private ChangeStock $changeStock) {}

    /**
     * Places a cash-on-delivery order. Variant rows are locked while stock is checked and
     * deducted, so two shoppers can't buy the last piece twice. A valid referral code
     * attributes the order to its affiliate with the commission in effect right now.
     *
     * @param  list<array{variant_id: int, quantity: int}>  $items
     * @param  array{recipient_name: string, phone: string, governorate_id: string, city_id: string, address_line: string, landmark?: string|null}  $address
     *
     * @throws ValidationException
     */
    public function handle(Store $store, Customer $customer, array $items, array $address, ?string $referralCode = null, ?string $note = null): Order
    {
        $quantities = collect($items)->groupBy('variant_id')->map(fn (Collection $lines): int => $lines->sum('quantity'));

        $order = DB::transaction(function () use ($store, $customer, $quantities, $address, $referralCode, $note): Order {
            // Serializes order numbers within the store.
            Store::query()->whereKey($store->id)->lockForUpdate()->first();

            $variants = ProductVariant::query()
                ->whereIn('id', $quantities->keys())
                ->whereHas('product', fn ($query) => $query->where('store_id', $store->id)->visibleInStore())
                ->with('product.images')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            $this->assertAvailable($quantities, $variants);

            $subtotal = round($quantities->sum(fn (int $quantity, int $variantId): float => $variants[$variantId]->price * $quantity), 2);
            $shippingFee = $store->shippingFeeFor($address['governorate_id'], $subtotal)
                ?? throw ValidationException::withMessages(['address.governorate_id' => __('orders.no_delivery')]);

            $order = $store->orders()->create([
                ...$address,
                ...$this->attribution($store, $customer, $referralCode, $subtotal),
                'customer_id' => $customer->id,
                'number' => ((int) $store->orders()->max('number') ?: 1000) + 1,
                'status' => OrderStatus::Pending,
                'subtotal' => $subtotal,
                'shipping_fee' => $shippingFee,
                'total' => $subtotal + $shippingFee,
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

                $this->changeStock->by($variant, -$quantity, StockMovementType::Sale, StockMovement::ACTOR_CUSTOMER, $order);
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
     * Affiliate and commission for an order placed through a referral code. Codes that are
     * unknown, disabled or belong to the customer themselves are ignored, not rejected.
     *
     * @return array<string, mixed>
     */
    private function attribution(Store $store, Customer $customer, ?string $code, float $subtotal): array
    {
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

        $commission = $referral->affiliate->effectiveCommission();
        $amount = $commission['type'] === CommissionType::Percentage ? round($subtotal * $commission['value'] / 100, 2) : $commission['value'];

        return [
            'affiliate_id' => $referral->affiliate_id,
            'referral_code_id' => $referral->id,
            'referral_code' => $referral->code,
            'commission_type' => $commission['type'],
            'commission_rate' => $commission['value'],
            'commission_amount' => $amount,
            'commission_status' => CommissionStatus::Pending,
        ];
    }
}
