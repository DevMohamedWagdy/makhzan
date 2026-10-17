<?php

namespace App\Models;

use App\Enums\LoyaltyTransactionType;
use App\Models\Concerns\BelongsToStore;
use Database\Factories\LoyaltyTransactionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One line of a customer's points ledger: points in (positive) or out (negative), and the
 * balance right after. Written only by App\Actions\Loyalty\ChangePoints.
 */
#[Fillable(['store_id', 'order_id', 'type', 'points', 'balance_after', 'note', 'actor'])]
class LoyaltyTransaction extends Model
{
    /** @use HasFactory<LoyaltyTransactionFactory> */
    use BelongsToStore, HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => LoyaltyTransactionType::class,
            'points' => 'integer',
            'balance_after' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Customer, $this>
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * @return BelongsTo<Order, $this>
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
