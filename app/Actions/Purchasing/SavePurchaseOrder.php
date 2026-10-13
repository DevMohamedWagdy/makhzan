<?php

namespace App\Actions\Purchasing;

use App\Enums\PurchaseOrderStatus;
use App\Models\ProductVariant;
use App\Models\PurchaseOrder;
use App\Models\Store;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SavePurchaseOrder
{
    /**
     * Creates a draft purchase order (numbered per store) or updates one that hasn't
     * received anything yet; its items are replaced with the given variants, whose names
     * are snapshotted.
     *
     * @param  array{supplier_id: int, warehouse_id?: int|null, expected_at?: string|null, notes?: string|null, items: list<array{variant_id: int, quantity: int, unit_cost: float|string}>}  $data
     *
     * @throws ValidationException
     */
    public function handle(Store $store, array $data, ?PurchaseOrder $purchaseOrder = null): PurchaseOrder
    {
        if ($purchaseOrder && ! $purchaseOrder->status->isEditable()) {
            throw ValidationException::withMessages(['status' => __('purchasing.not_editable')]);
        }

        return DB::transaction(function () use ($store, $data, $purchaseOrder): PurchaseOrder {
            if (! $purchaseOrder) {
                // Serializes numbering within the store.
                $store->newQuery()->whereKey($store->id)->lockForUpdate()->first();

                $purchaseOrder = $store->purchaseOrders()->make([
                    'number' => (int) $store->purchaseOrders()->max('number') + 1,
                    'status' => PurchaseOrderStatus::Draft,
                ]);
            }

            $purchaseOrder->fill([
                'supplier_id' => $data['supplier_id'],
                'warehouse_id' => $data['warehouse_id'] ?? $store->defaultWarehouse()->id,
                'expected_at' => $data['expected_at'] ?? null,
                'notes' => $data['notes'] ?? null,
            ])->save();

            $variants = ProductVariant::query()
                ->whereIn('id', array_column($data['items'], 'variant_id'))
                ->with('product')
                ->get()
                ->keyBy('id');

            $purchaseOrder->items()->delete();

            foreach ($data['items'] as $item) {
                $variant = $variants[$item['variant_id']];

                $purchaseOrder->items()->create([
                    'product_id' => $variant->product_id,
                    'product_variant_id' => $variant->id,
                    'product_name' => $variant->product->name,
                    'variant_title' => $variant->title() ?: null,
                    'sku' => $variant->sku,
                    'quantity_ordered' => $item['quantity'],
                    'unit_cost' => $item['unit_cost'],
                ]);
            }

            return $purchaseOrder->load(['supplier', 'warehouse', 'items']);
        });
    }
}
