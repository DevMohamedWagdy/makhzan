<?php

namespace App\Models;

use App\Models\Concerns\BelongsToStore;
use Database\Factories\SupplierPaymentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Money the store paid a supplier (cash, bank transfer, wallet…), lowering what it owes them.
 */
#[Fillable(['supplier_id', 'amount', 'paid_at', 'method', 'reference', 'note', 'vendor_id'])]
class SupplierPayment extends Model
{
    /** @use HasFactory<SupplierPaymentFactory> */
    use BelongsToStore, HasFactory;

    public const METHODS = ['cash', 'bank_transfer', 'wallet', 'cheque', 'other'];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'paid_at' => 'date',
        ];
    }

    /**
     * @return BelongsTo<Supplier, $this>
     */
    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    /**
     * @return BelongsTo<Vendor, $this>
     */
    public function vendor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class);
    }
}
