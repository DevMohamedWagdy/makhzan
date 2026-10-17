<?php

namespace App\Models;

use App\Enums\PurchaseOrderStatus;
use App\Models\Concerns\BelongsToStore;
use App\Models\Concerns\LogsActivity;
use Database\Factories\SupplierFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A company or person the store buys stock from.
 */
#[Fillable(['name', 'contact_name', 'phone', 'email', 'address', 'notes'])]
class Supplier extends Model
{
    /** @use HasFactory<SupplierFactory> */
    use BelongsToStore, HasFactory, LogsActivity;

    /**
     * @return BelongsTo<Store, $this>
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /**
     * @return HasMany<PurchaseOrder, $this>
     */
    public function purchaseOrders(): HasMany
    {
        return $this->hasMany(PurchaseOrder::class);
    }

    /**
     * Orders still waiting for goods.
     *
     * @return HasMany<PurchaseOrder, $this>
     */
    public function openPurchaseOrders(): HasMany
    {
        return $this->purchaseOrders()->whereIn('status', [PurchaseOrderStatus::Ordered, PurchaseOrderStatus::Partial]);
    }

    /**
     * Search by name, contact person or phone.
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function search(Builder $query, ?string $term): void
    {
        $term = trim((string) $term);

        if ($term === '') {
            return;
        }

        $query->where(fn (Builder $query) => $query
            ->where('name', 'like', "%{$term}%")
            ->orWhere('contact_name', 'like', "%{$term}%")
            ->orWhere('phone', 'like', "%{$term}%"));
    }
}
