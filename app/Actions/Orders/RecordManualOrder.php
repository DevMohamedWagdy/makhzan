<?php

namespace App\Actions\Orders;

use App\Enums\CommissionStatus;
use App\Enums\OrderSource;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\ProductStatus;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderEvent;
use App\Models\ProductVariant;
use App\Models\Store;
use App\Notifications\CustomerOrderUpdateNotification;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class RecordManualOrder
{
    public function __construct(private PlaceOrder $placeOrder, private UpdateOrderStatus $updateStatus) {}

    /**
     * Records an order the vendor took outside the storefront (WhatsApp, Messenger, a call, in
     * person). It's cash on delivery and deducts stock like a storefront order, but skips the
     * shopper rules: the store may be closed to online orders, draft products can be sold, there's
     * no minimum total, and the vendor sets the shipping fee (the governorate's rate when not
     * given, or free where the store doesn't normally deliver) and an optional discount.
     *
     * The order goes to the given customer, or the store's customer with the recipient's phone,
     * created without a usable password when there's none (they can set one with "forgot
     * password"). With $confirm it's confirmed right away, since the vendor already agreed it.
     *
     * @param  list<array{variant_id: int, quantity: int}>  $items
     * @param  array{recipient_name: string, phone: string, governorate_id: string, city_id: string, address_line: string, landmark?: string|null}  $address
     *
     * @throws ValidationException
     */
    public function handle(Store $store, OrderSource $source, array $items, array $address, ?Customer $customer = null, ?float $shippingFee = null, float $discount = 0, ?string $note = null, bool $confirm = false): Order
    {
        $quantities = collect($items)->groupBy('variant_id')->map(fn (Collection $lines): int => $lines->sum('quantity'));

        $order = DB::transaction(function () use ($store, $source, $quantities, $address, $customer, $shippingFee, $discount, $note): Order {
            // Serializes order numbers within the store.
            $store = Store::query()->whereKey($store->id)->lockForUpdate()->first();

            $variants = ProductVariant::query()
                ->whereIn('id', $quantities->keys())
                ->whereHas('product', fn ($query) => $query->where('store_id', $store->id)->where('status', '!=', ProductStatus::Archived))
                ->with(['product.images'])
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            $this->placeOrder->assertAvailable($quantities, $variants);

            $subtotal = round($quantities->sum(fn (int $quantity, int $variantId): float => $variants[$variantId]->price * $quantity), 2);

            if ($discount > $subtotal) {
                throw ValidationException::withMessages(['discount' => __('orders.manual.discount_too_high')]);
            }

            $shippingFee ??= $store->shippingFeeFor($address['governorate_id'], $subtotal) ?? 0.0;
            $customer ??= $this->customerFor($store, $address);

            $order = $store->orders()->create([
                ...$address,
                'customer_id' => $customer->id,
                'number' => $this->placeOrder->nextNumber($store),
                'source' => $source,
                'status' => OrderStatus::Pending,
                'payment_method' => PaymentMethod::Cod,
                'subtotal' => $subtotal,
                'discount' => round($discount, 2),
                'shipping_fee' => round($shippingFee, 2),
                'shipping_discount' => 0,
                'total' => round($subtotal - $discount + $shippingFee, 2),
                'customer_note' => $note,
                'commission_status' => CommissionStatus::None,
            ]);

            $this->placeOrder->addItems($order, $quantities, $variants);

            $order->events()->create(['status' => OrderStatus::Pending, 'actor' => OrderEvent::ACTOR_VENDOR, 'note' => __('orders.manual.recorded_from', ['source' => __("orders.sources.{$source->value}")])]);
            $customer->forceFill(['last_order_at' => now()])->save();

            return $order;
        });

        if ($confirm) {
            return $this->updateStatus->handle($order, OrderStatus::Confirmed, OrderEvent::ACTOR_VENDOR);
        }

        $order->customer->notify(new CustomerOrderUpdateNotification($order, OrderStatus::Pending));

        return $order;
    }

    /**
     * The store's customer with the recipient's phone, or a new one under the recipient's name.
     *
     * @param  array{recipient_name: string, phone: string}  $address
     */
    private function customerFor(Store $store, array $address): Customer
    {
        return $store->customers()->firstOrCreate(
            ['phone' => $address['phone']],
            ['full_name' => $address['recipient_name'], 'password' => Str::random(40)],
        );
    }
}
