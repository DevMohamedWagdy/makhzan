<?php

namespace App\Models;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Concerns\BelongsToStore;
use Database\Factories\PaymentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * One attempt to pay an order online. Started by App\Actions\Payments\StartPayment and settled
 * by the gateway's callback (App\Actions\Payments\RecordPaymentResult).
 */
#[Fillable([
    'store_id', 'gateway', 'method', 'status', 'amount', 'refunded_amount', 'reference',
    'gateway_intention_id', 'gateway_order_id', 'gateway_transaction_id', 'checkout_url', 'failure_reason', 'payload', 'paid_at',
])]
class Payment extends Model
{
    /** @use HasFactory<PaymentFactory> */
    use BelongsToStore, HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'method' => PaymentMethod::class,
            'status' => PaymentStatus::class,
            'amount' => 'float',
            'refunded_amount' => 'float',
            'payload' => 'array',
            'paid_at' => 'datetime',
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
     * @return BelongsTo<Order, $this>
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * @return HasMany<PaymentRefund, $this>
     */
    public function refunds(): HasMany
    {
        return $this->hasMany(PaymentRefund::class);
    }

    /**
     * What's left to refund.
     */
    public function refundable(): float
    {
        return $this->status?->isPaid() ? round($this->amount - $this->refunded_amount, 2) : 0.0;
    }
}
