<?php

namespace App\Actions\Inventory;

use App\Enums\StockMovementType;
use App\Models\Order;
use App\Models\ProductVariant;
use App\Models\PurchaseOrder;
use App\Models\StockMovement;
use App\Models\StockTransfer;
use App\Models\Warehouse;
use App\Models\WarehouseStock;
use App\Notifications\StockAlertNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * The only way stock changes. Each change happens in one warehouse: it locks the variant
 * (serializing every change to it), updates the warehouse's quantity and the variant's total,
 * logs a stock movement and, when the total drops to the low-stock threshold or runs out,
 * notifies the vendor once the surrounding transaction commits.
 */
class ChangeStock
{
    /**
     * Adds (positive) or removes (negative) units in a warehouse (the store's default when
     * none is given). Restocks with a unit cost update the variant's cost to the weighted
     * average of old and new units.
     *
     * @throws ValidationException when removing more than the warehouse holds
     */
    public function by(
        ProductVariant $variant,
        int $change,
        StockMovementType $type,
        string $actor,
        ?Order $order = null,
        ?string $note = null,
        ?float $unitCost = null,
        ?PurchaseOrder $purchaseOrder = null,
        ?Warehouse $warehouse = null,
        ?StockTransfer $transfer = null,
    ): ?StockMovement {
        return DB::transaction(function () use ($variant, $change, $type, $actor, $order, $note, $unitCost, $purchaseOrder, $warehouse, $transfer): ?StockMovement {
            $locked = $this->lock($variant);
            $warehouse ??= $locked->product->store->defaultWarehouse();

            return $this->record($variant, $locked, $warehouse, $change, $type, $actor, $order, $note, $unitCost, $purchaseOrder, $transfer);
        });
    }

    /**
     * Sets a warehouse's quantity to a counted number (stock count, spreadsheet import), logging the difference.
     */
    public function to(ProductVariant $variant, int $quantity, StockMovementType $type, string $actor, ?string $note = null, ?Warehouse $warehouse = null): ?StockMovement
    {
        return DB::transaction(function () use ($variant, $quantity, $type, $actor, $note, $warehouse): ?StockMovement {
            $locked = $this->lock($variant);
            $warehouse ??= $locked->product->store->defaultWarehouse();
            $current = $this->warehouseStock($warehouse, $locked)->stock;

            return $this->record($variant, $locked, $warehouse, $quantity - $current, $type, $actor, null, $note, null, null, null);
        });
    }

    /**
     * Sets the variant's total (the product form's quantity field): the difference is applied
     * to the given warehouse (the store's default when none is given), whose quantity can't go below zero.
     *
     * @throws ValidationException when the total is less than what the other warehouses hold
     */
    public function total(ProductVariant $variant, int $total, StockMovementType $type, string $actor, ?Warehouse $warehouse = null): ?StockMovement
    {
        return DB::transaction(function () use ($variant, $total, $type, $actor, $warehouse): ?StockMovement {
            $locked = $this->lock($variant);
            $warehouse ??= $locked->product->store->defaultWarehouse();
            $elsewhere = $locked->stock - $this->warehouseStock($warehouse, $locked)->stock;

            if ($total < $elsewhere) {
                throw ValidationException::withMessages(['stock' => __('inventory.below_other_warehouses', ['count' => $elsewhere])]);
            }

            return $this->record($variant, $locked, $warehouse, $total - $locked->stock, $type, $actor, null, null, null, null, null);
        });
    }

    /**
     * Takes units for an order from the store's warehouses, splitting across them when one
     * doesn't hold enough: warehouses in the customer's governorate first, then the rest, each
     * group in priority order.
     *
     * @return list<StockMovement>
     *
     * @throws ValidationException when all warehouses together don't hold enough
     */
    public function sell(ProductVariant $variant, int $quantity, Order $order): array
    {
        return DB::transaction(function () use ($variant, $quantity, $order): array {
            $locked = $this->lock($variant);

            if ($quantity > $locked->stock) {
                throw ValidationException::withMessages(['quantity' => __('inventory.exceeds_stock', ['available' => $locked->stock])]);
            }

            $movements = [];
            $remaining = $quantity;

            $warehouses = $locked->product->store->warehouses
                ->sortBy(fn (Warehouse $warehouse): int => $warehouse->governorate_id !== null && $warehouse->governorate_id === $order->governorate_id ? 0 : 1);

            foreach ($warehouses as $warehouse) {
                $available = $this->warehouseStock($warehouse, $locked)->stock;
                $take = min($available, $remaining);

                if ($take > 0) {
                    $movements[] = $this->record($variant, $locked, $warehouse, -$take, StockMovementType::Sale, StockMovement::ACTOR_CUSTOMER, $order, null, null, null, null);
                    $remaining -= $take;
                }

                if ($remaining === 0) {
                    break;
                }
            }

            return $movements;
        });
    }

    /**
     * Locks the variant and makes its warehouse rows add up to its total: stock recorded on
     * the variant without a warehouse (set before warehouses existed, or by seeders) is
     * treated as being in the default warehouse.
     */
    private function lock(ProductVariant $variant): ProductVariant
    {
        $locked = ProductVariant::query()->whereKey($variant->id)->with('product.store')->lockForUpdate()->firstOrFail();
        $unallocated = $locked->stock - (int) WarehouseStock::query()->where('product_variant_id', $locked->id)->sum('stock');

        if ($unallocated !== 0) {
            $row = $this->warehouseStock($locked->product->store->defaultWarehouse(), $locked);
            $row->forceFill(['stock' => max(0, $row->stock + $unallocated)])->save();
        }

        return $locked;
    }

    /**
     * The variant's row in the warehouse, created empty on first use. Safe without its own
     * lock: every caller holds the variant's lock.
     */
    private function warehouseStock(Warehouse $warehouse, ProductVariant $variant): WarehouseStock
    {
        return WarehouseStock::query()->firstOrCreate(['warehouse_id' => $warehouse->id, 'product_variant_id' => $variant->id], ['stock' => 0]);
    }

    /**
     * @throws ValidationException
     */
    private function record(
        ProductVariant $variant,
        ProductVariant $locked,
        Warehouse $warehouse,
        int $change,
        StockMovementType $type,
        string $actor,
        ?Order $order,
        ?string $note,
        ?float $unitCost,
        ?PurchaseOrder $purchaseOrder,
        ?StockTransfer $transfer,
    ): ?StockMovement {
        if ($change === 0) {
            return null;
        }

        $product = $locked->product;
        $store = $product->store;

        if ($warehouse->store_id !== $store->id) {
            throw ValidationException::withMessages(['warehouse_id' => __('inventory.warehouse_not_found')]);
        }

        $row = $this->warehouseStock($warehouse, $locked);
        $warehouseBefore = $row->stock;

        if ($warehouseBefore + $change < 0) {
            throw ValidationException::withMessages(['quantity' => __('inventory.exceeds_warehouse_stock', ['available' => $warehouseBefore, 'warehouse' => $warehouse->name])]);
        }

        $before = $locked->stock;
        $after = $before + $change;

        $row->forceFill(['stock' => $warehouseBefore + $change])->save();
        $locked->stock = $after;

        if ($type === StockMovementType::Restock && $unitCost !== null) {
            $locked->cost = $locked->cost === null || $before <= 0
                ? round($unitCost, 2)
                : round(($before * $locked->cost + $change * $unitCost) / $after, 2);
        }

        $locked->save();

        // Keep the caller's instance in step with the database.
        $variant->forceFill(['stock' => $locked->stock, 'cost' => $locked->cost])->syncOriginalAttributes(['stock', 'cost']);

        $movement = $store->stockMovements()->create([
            'product_id' => $product->id,
            'product_variant_id' => $locked->id,
            'warehouse_id' => $warehouse->id,
            'warehouse_name' => $warehouse->name,
            'product_name' => $product->name,
            'variant_title' => $locked->title() ?: null,
            'type' => $type,
            'quantity' => $change,
            'stock_before' => $before,
            'stock_after' => $after,
            'warehouse_stock_before' => $warehouseBefore,
            'warehouse_stock_after' => $warehouseBefore + $change,
            'unit_cost' => $unitCost ?? $locked->cost,
            'order_id' => $order?->id,
            'purchase_order_id' => $purchaseOrder?->id,
            'stock_transfer_id' => $transfer?->id,
            'actor' => $actor,
            'note' => $note,
        ]);

        $threshold = $locked->lowStockThreshold($store);
        $ranOut = $after === 0 && $before > 0;
        $ranLow = $after > 0 && $after <= $threshold && $before > $threshold;

        if ($ranOut || $ranLow) {
            DB::afterCommit(fn () => $store->vendor->notify(new StockAlertNotification($locked, $after, $threshold)));
        }

        return $movement;
    }
}
