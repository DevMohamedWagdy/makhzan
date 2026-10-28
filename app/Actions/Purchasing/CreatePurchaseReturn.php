<?php

namespace App\Actions\Purchasing;

use App\Actions\Inventory\ChangeStock;
use App\Enums\StockMovementType;
use App\Models\ProductVariant;
use App\Models\PurchaseReturn;
use App\Models\StockMovement;
use App\Models\Store;
use App\Models\Supplier;
use App\Models\Vendor;
use App\Models\Warehouse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Sends goods back to a supplier: each item leaves the warehouse (logged as a supplier return) and the
 * total is credited to the supplier's account. All or nothing: one item short of stock stops the return.
 */
class CreatePurchaseReturn
{
    public function __construct(private ChangeStock $changeStock) {}

    /**
     * @param  list<array{variant_id: int, quantity: int, unit_cost: float|int|string}>  $items
     *
     * @throws ValidationException
     */
    public function handle(Store $store, Supplier $supplier, Warehouse $warehouse, array $items, ?string $note, ?Vendor $vendor): PurchaseReturn
    {
        return DB::transaction(function () use ($store, $supplier, $warehouse, $items, $note, $vendor): PurchaseReturn {
            // Serializes numbering within the store.
            $store->newQuery()->whereKey($store->id)->lockForUpdate()->first();

            $variants = ProductVariant::query()->with('product')->whereKey(array_column($items, 'variant_id'))->get()->keyBy('id');
            $return = $store->purchaseReturns()->create([
                'supplier_id' => $supplier->id,
                'warehouse_id' => $warehouse->id,
                'warehouse_name' => $warehouse->name,
                'number' => (int) $store->purchaseReturns()->max('number') + 1,
                'total' => 0,
                'note' => $note,
                'vendor_id' => $vendor?->id,
            ]);
            $movementNote = __('purchasing.return_note', ['number' => $return->number, 'supplier' => $supplier->name]);
            $total = 0;

            foreach ($items as $index => $item) {
                $variant = $variants[$item['variant_id']];

                try {
                    $this->changeStock->by($variant, -$item['quantity'], StockMovementType::SupplierReturn, StockMovement::ACTOR_VENDOR, note: $movementNote, unitCost: (float) $item['unit_cost'], warehouse: $warehouse);
                } catch (ValidationException) {
                    throw ValidationException::withMessages(["items.{$index}.quantity" => __('purchasing.return_exceeds_stock', ['product' => $variant->product->name])]);
                }

                $return->items()->create([
                    'product_variant_id' => $variant->id,
                    'product_name' => $variant->product->name,
                    'variant_title' => $variant->title(),
                    'quantity' => $item['quantity'],
                    'unit_cost' => $item['unit_cost'],
                ]);
                $total += $item['quantity'] * (float) $item['unit_cost'];
            }

            $return->update(['total' => round($total, 2)]);

            return $return->load('items');
        });
    }
}
