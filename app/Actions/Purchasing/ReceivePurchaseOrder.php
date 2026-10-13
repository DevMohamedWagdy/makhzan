<?php

namespace App\Actions\Purchasing;

use App\Actions\Inventory\ChangeStock;
use App\Enums\PurchaseOrderStatus;
use App\Enums\StockMovementType;
use App\Models\PurchaseOrder;
use App\Models\StockMovement;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReceivePurchaseOrder
{
    public function __construct(private ChangeStock $changeStock) {}

    /**
     * Records goods that arrived: each quantity restocks its variant at the order's unit
     * cost (updating the variant's average cost) into the order's warehouse and is logged
     * against the purchase order.
     * The order becomes partially or fully received; receiving a draft also marks it ordered.
     *
     * @param  array<int, int>  $quantities  purchase order item id => quantity received now
     *
     * @throws ValidationException
     */
    public function handle(PurchaseOrder $purchaseOrder, array $quantities, ?string $note = null): PurchaseOrder
    {
        return DB::transaction(function () use ($purchaseOrder, $quantities, $note): PurchaseOrder {
            $purchaseOrder = PurchaseOrder::query()->whereKey($purchaseOrder->id)->lockForUpdate()->firstOrFail();

            if (! $purchaseOrder->status->canReceive()) {
                throw ValidationException::withMessages(['status' => __('purchasing.cannot_receive')]);
            }

            $items = $purchaseOrder->items()->with('variant')->get()->keyBy('id');
            $errors = [];

            foreach ($quantities as $itemId => $quantity) {
                $item = $items->get($itemId);

                if (! $item) {
                    $errors["items.{$itemId}"] = __('purchasing.item_not_found');
                } elseif ($quantity > $item->remaining()) {
                    $errors["items.{$itemId}"] = __('purchasing.exceeds_remaining', ['remaining' => $item->remaining()]);
                } elseif ($quantity > 0 && ! $item->variant) {
                    $errors["items.{$itemId}"] = __('purchasing.variant_deleted');
                }
            }

            if ($errors) {
                throw ValidationException::withMessages($errors);
            }

            if (array_sum($quantities) < 1) {
                throw ValidationException::withMessages(['items' => __('purchasing.nothing_to_receive')]);
            }

            $note = trim(__('purchasing.receipt_note', ['number' => $purchaseOrder->number]).($note ? " — {$note}" : ''));

            foreach ($quantities as $itemId => $quantity) {
                if ($quantity < 1) {
                    continue;
                }

                $item = $items[$itemId];
                $this->changeStock->by($item->variant, $quantity, StockMovementType::Restock, StockMovement::ACTOR_VENDOR, note: $note, unitCost: $item->unit_cost, purchaseOrder: $purchaseOrder, warehouse: $purchaseOrder->warehouse);
                $item->increment('quantity_received', $quantity);
            }

            $complete = $items->every(fn ($item): bool => $item->remaining() === 0);

            $purchaseOrder->forceFill([
                'status' => $complete ? PurchaseOrderStatus::Received : PurchaseOrderStatus::Partial,
                'ordered_at' => $purchaseOrder->ordered_at ?? now(),
                'received_at' => $complete ? now() : null,
            ])->save();

            return $purchaseOrder->load(['supplier', 'warehouse', 'items']);
        });
    }
}
