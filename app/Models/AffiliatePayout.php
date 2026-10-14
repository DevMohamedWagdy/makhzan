<?php

namespace App\Models;

use App\Enums\PayoutMethod;
use App\Enums\PayoutStatus;
use App\Models\Concerns\LogsActivity;
use Database\Factories\AffiliatePayoutFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A commission transfer between a vendor and an affiliate. It starts either as the
 * affiliate's transfer request (requested) or as a payment the vendor already sent outside
 * the app (paid). Only a paid payout deducts from the affiliate's pending balance.
 */
#[Fillable([
    'store_id', 'amount', 'status', 'payout_type', 'payout_account_name', 'payout_account_last4',
    'reference', 'request_note', 'note', 'paid_at', 'rejected_at',
])]
class AffiliatePayout extends Model
{
    /** @use HasFactory<AffiliatePayoutFactory> */
    use HasFactory, LogsActivity;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount' => 'float',
            'status' => PayoutStatus::class,
            'payout_type' => PayoutMethod::class,
            'paid_at' => 'datetime',
            'rejected_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Affiliate, $this>
     */
    public function affiliate(): BelongsTo
    {
        return $this->belongsTo(Affiliate::class);
    }

    /**
     * @return BelongsTo<Store, $this>
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /**
     * Declines an open transfer request. The pending balance is untouched.
     */
    public function reject(?string $note): void
    {
        $this->forceFill([
            'status' => PayoutStatus::Rejected,
            'note' => $note,
            'rejected_at' => now(),
        ])->save();
    }
}
