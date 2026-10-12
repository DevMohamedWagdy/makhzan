<?php

namespace App\Actions\Inventory;

use App\Enums\StockMovementType;
use App\Models\Order;
use App\Models\ProductVariant;
use App\Models\StockMovement;
use App\Notifications\StockAlertNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * The only way stock changes: locks the variant, applies the change, logs it as a stock
 * movement and, when stock drops to the low-stock threshold or runs out, notifies the
 * vendor once the surrounding transaction commits.
 */
class ChangeStock
{
    /**
     * Adds (positive) or removes (negative) units. Restocks with a unit cost update the
     * variant's cost to the weighted average of old and new units.
     *
     * @throws ValidationException when removing more than is in stock
     */
    public function by(ProductVariant $variant, int $change, StockMovementType $type, string $actor, ?Order $order = null, ?string $note = null, ?float $unitCost = null): ?StockMovement
    {
        return DB::transaction(function () use ($variant, $change, $type, $actor, $order, $note, $unitCost): ?StockMovement {
            $locked = $this->lock($variant);

            return $this->record($variant, $locked, $change, $type, $actor, $order, $note, $unitCost);
        });
    }

    /**
     * Sets the stock to a counted quantity (stock count or product form edit), logging the difference.
     */
    public function to(ProductVariant $variant, int $quantity, StockMovementType $type, string $actor, ?string $note = null): ?StockMovement
    {
        return DB::transaction(function () use ($variant, $quantity, $type, $actor, $note): ?StockMovement {
            $locked = $this->lock($variant);

            return $this->record($variant, $locked, $quantity - $locked->stock, $type, $actor, null, $note, null);
        });
    }

    private function lock(ProductVariant $variant): ProductVariant
    {
        return ProductVariant::query()->whereKey($variant->id)->with('product.store')->lockForUpdate()->firstOrFail();
    }

    /**
     * @throws ValidationException
     */
    private function record(ProductVariant $variant, ProductVariant $locked, int $change, StockMovementType $type, string $actor, ?Order $order, ?string $note, ?float $unitCost): ?StockMovement
    {
        if ($change === 0) {
            return null;
        }

        $before = $locked->stock;
        $after = $before + $change;

        if ($after < 0) {
            throw ValidationException::withMessages(['quantity' => __('inventory.exceeds_stock', ['available' => $before])]);
        }

        $locked->stock = $after;

        if ($type === StockMovementType::Restock && $unitCost !== null) {
            $locked->cost = $locked->cost === null || $before <= 0
                ? round($unitCost, 2)
                : round(($before * $locked->cost + $change * $unitCost) / $after, 2);
        }

        $locked->save();

        // Keep the caller's instance in step with the database.
        $variant->forceFill(['stock' => $locked->stock, 'cost' => $locked->cost])->syncOriginalAttributes(['stock', 'cost']);

        $product = $locked->product;
        $store = $product->store;

        $movement = $store->stockMovements()->create([
            'product_id' => $product->id,
            'product_variant_id' => $locked->id,
            'product_name' => $product->name,
            'variant_title' => $locked->title() ?: null,
            'type' => $type,
            'quantity' => $change,
            'stock_before' => $before,
            'stock_after' => $after,
            'unit_cost' => $unitCost ?? $locked->cost,
            'order_id' => $order?->id,
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
