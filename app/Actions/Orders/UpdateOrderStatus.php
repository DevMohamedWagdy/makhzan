<?php

namespace App\Actions\Orders;

use App\Actions\Inventory\ChangeStock;
use App\Enums\CommissionStatus;
use App\Enums\OrderStatus;
use App\Enums\StockMovementType;
use App\Models\Affiliate;
use App\Models\AffiliateReferralCode;
use App\Models\Order;
use App\Models\ProductVariant;
use App\Models\StockMovement;
use App\Notifications\AffiliateCommissionNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UpdateOrderStatus
{
    public function __construct(private ChangeStock $changeStock) {}

    /**
     * Moves an order along its lifecycle (see OrderStatus::next()) and applies the side
     * effects: cancelled and returned orders go back to stock; the affiliate is credited when
     * the order is delivered and debited if a delivered order is returned, and is notified
     * whenever their commission changes. An online order can't be confirmed before it's paid,
     * and an affiliate never told about an unpaid order isn't told when it's dropped.
     *
     * With $onlyIfUnpaid, an order whose payment has come through is returned unchanged.
     *
     * @throws ValidationException
     */
    public function handle(Order $order, OrderStatus $status, string $actor, ?string $note = null, bool $onlyIfUnpaid = false): Order
    {
        $commissionEvent = null;

        $order = DB::transaction(function () use ($order, $status, $actor, $note, $onlyIfUnpaid, &$commissionEvent): Order {
            $order = Order::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();
            $previous = $order->status;
            $unpaid = $order->awaitingPayment();

            if ($onlyIfUnpaid && ! $unpaid) {
                return $order;
            }

            if (! $previous->canMoveTo($status)) {
                throw ValidationException::withMessages(['status' => __('orders.invalid_transition')]);
            }

            if ($status === OrderStatus::Confirmed && $unpaid) {
                throw ValidationException::withMessages(['status' => __('payments.awaiting_payment')]);
            }

            $order->status = $status;
            $order->{$status->timestampColumn()} = now();

            if ($status === OrderStatus::Cancelled) {
                $order->cancel_reason = $note;
            }

            if ($status->restocks()) {
                $this->restock($order, $status, $actor);
            }

            $commissionEvent = $this->settleCommission($order, $previous, $status);

            if ($unpaid) {
                $commissionEvent = null;
            }

            $order->save();
            $order->events()->create(['status' => $status, 'actor' => $actor, 'note' => $note]);

            return $order;
        });

        if ($commissionEvent) {
            $order->affiliate?->notify(new AffiliateCommissionNotification($order, $commissionEvent));
        }

        return $order;
    }

    /**
     * Puts the order's items back on the shelf, logged as a cancellation or a return, in the
     * warehouses they were taken from (the default warehouse for anything taken before
     * warehouses existed, or from a warehouse since deleted). Variants deleted since the
     * order was placed are skipped.
     */
    private function restock(Order $order, OrderStatus $status, string $actor): void
    {
        $type = $status === OrderStatus::Returned ? StockMovementType::Return : StockMovementType::Cancellation;
        $taken = StockMovement::query()
            ->where('order_id', $order->id)
            ->where('type', StockMovementType::Sale)
            ->with('warehouse')
            ->get()
            ->groupBy('product_variant_id');

        foreach ($order->items()->whereNotNull('product_variant_id')->get() as $item) {
            $variant = ProductVariant::query()->find($item->product_variant_id);

            if (! $variant) {
                continue;
            }

            $remaining = $item->quantity;

            foreach ($taken->get($variant->id, collect()) as $sale) {
                $quantity = min(-$sale->quantity, $remaining);

                if ($quantity > 0 && $sale->warehouse) {
                    $this->changeStock->by($variant, $quantity, $type, $actor, $order, warehouse: $sale->warehouse);
                    $remaining -= $quantity;
                }
            }

            if ($remaining > 0) {
                $this->changeStock->by($variant, $remaining, $type, $actor, $order);
            }
        }
    }

    /**
     * Earned on delivery; reversed if a delivered order comes back; dropped if the order
     * never reaches the customer. Returns the AffiliateCommissionNotification event, if any.
     */
    private function settleCommission(Order $order, OrderStatus $from, OrderStatus $to): ?string
    {
        $commission = $order->commission_status;

        if ($to === OrderStatus::Delivered && $commission === CommissionStatus::Pending) {
            $this->adjustAffiliate($order, 1);
            $order->commission_status = CommissionStatus::Earned;

            return AffiliateCommissionNotification::EARNED;
        }

        if ($to === OrderStatus::Returned && $from === OrderStatus::Delivered && $commission === CommissionStatus::Earned) {
            $this->adjustAffiliate($order, -1);
            $order->commission_status = CommissionStatus::Cancelled;

            return AffiliateCommissionNotification::REVERSED;
        }

        if ($to->restocks() && $commission === CommissionStatus::Pending) {
            $order->commission_status = CommissionStatus::Cancelled;

            return AffiliateCommissionNotification::CANCELLED;
        }

        return null;
    }

    /**
     * Adds (+1) or removes (-1) the order from the affiliate's counters. A returned order
     * whose commission was already paid out leaves a negative pending balance.
     */
    private function adjustAffiliate(Order $order, int $direction): void
    {
        $affiliate = $order->affiliate_id ? Affiliate::query()->whereKey($order->affiliate_id)->lockForUpdate()->first() : null;

        if (! $affiliate) {
            return;
        }

        $affiliate->forceFill([
            'orders_count' => max(0, $affiliate->orders_count + $direction),
            'sales_total' => round($affiliate->sales_total + $direction * $order->subtotal, 2),
            'earned_commission' => round($affiliate->earned_commission + $direction * $order->commission_amount, 2),
            'pending_balance' => round($affiliate->pending_balance + $direction * $order->commission_amount, 2),
        ])->save();

        if ($order->referral_code_id) {
            $direction > 0
                ? AffiliateReferralCode::query()->whereKey($order->referral_code_id)->increment('orders')
                : AffiliateReferralCode::query()->whereKey($order->referral_code_id)->where('orders', '>', 0)->decrement('orders');
        }
    }
}
