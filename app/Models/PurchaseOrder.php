<?php

namespace App\Models;

use App\Enums\PurchaseOrderStatus;
use Database\Factories\PurchaseOrderFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Goods ordered from a supplier. Receiving them (fully or in parts) restocks the variants
 * through App\Actions\Purchasing\ReceivePurchaseOrder.
 */
#[Fillable(['supplier_id', 'warehouse_id', 'number', 'status', 'expected_at', 'notes', 'ordered_at', 'received_at', 'closed_at', 'cancelled_at'])]
class PurchaseOrder extends Model
{
    /** @use HasFactory<PurchaseOrderFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'number' => 'integer',
            'status' => PurchaseOrderStatus::class,
            'expected_at' => 'date',
            'ordered_at' => 'datetime',
            'received_at' => 'datetime',
            'closed_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Store, $this>
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /**
     * @return BelongsTo<Supplier, $this>
     */
    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    /**
     * Where received goods are stocked (the store's default warehouse when unset).
     *
     * @return BelongsTo<Warehouse, $this>
     */
    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    /**
     * @return HasMany<PurchaseOrderItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(PurchaseOrderItem::class)->oldest('id');
    }

    /**
     * Value of everything ordered, at the agreed unit costs.
     */
    public function orderedTotal(): float
    {
        return round($this->items->sum(fn (PurchaseOrderItem $item): float => $item->quantity_ordered * $item->unit_cost), 2);
    }

    /**
     * Value of what has arrived so far.
     */
    public function receivedTotal(): float
    {
        return round($this->items->sum(fn (PurchaseOrderItem $item): float => $item->quantity_received * $item->unit_cost), 2);
    }
}
