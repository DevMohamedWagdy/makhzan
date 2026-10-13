<?php

namespace App\Actions\Inventory;

use App\Enums\StockMovementType;
use App\Models\ProductVariant;
use App\Models\StockMovement;
use App\Models\StockTransfer;
use App\Models\Store;
use App\Models\Warehouse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TransferStock
{
    public function __construct(private ChangeStock $changeStock) {}

    /**
     * Moves units between two of the store's warehouses at once: each item is logged as a
     * movement out of one and into the other (the variant's total doesn't change). Nothing is
     * moved if any item exceeds what the source warehouse holds.
     *
     * @param  list<array{variant_id: int, quantity: int}>  $items
     *
     * @throws ValidationException
     */
    public function handle(Store $store, Warehouse $from, Warehouse $to, array $items, ?string $note = null): StockTransfer
    {
        return DB::transaction(function () use ($store, $from, $to, $items, $note): StockTransfer {
            // Serializes numbering within the store.
            $store->newQuery()->whereKey($store->id)->lockForUpdate()->first();

            $transfer = $store->stockTransfers()->create([
                'number' => (int) $store->stockTransfers()->max('number') + 1,
                'from_warehouse_id' => $from->id,
                'to_warehouse_id' => $to->id,
                'from_warehouse_name' => $from->name,
                'to_warehouse_name' => $to->name,
                'note' => $note,
            ]);

            $variants = ProductVariant::query()->whereIn('id', array_column($items, 'variant_id'))->with('product')->get()->keyBy('id');

            foreach (array_values($items) as $index => $item) {
                $variant = $variants[$item['variant_id']];

                try {
                    $this->changeStock->by($variant, -$item['quantity'], StockMovementType::Transfer, StockMovement::ACTOR_VENDOR, note: $note, warehouse: $from, transfer: $transfer);
                } catch (ValidationException $exception) {
                    throw ValidationException::withMessages(["items.{$index}.quantity" => $exception->validator->errors()->first()]);
                }

                $this->changeStock->by($variant, $item['quantity'], StockMovementType::Transfer, StockMovement::ACTOR_VENDOR, note: $note, warehouse: $to, transfer: $transfer);

                $transfer->items()->create([
                    'product_variant_id' => $variant->id,
                    'product_name' => $variant->product->name,
                    'variant_title' => $variant->title() ?: null,
                    'quantity' => $item['quantity'],
                ]);
            }

            return $transfer->load('items');
        });
    }
}
