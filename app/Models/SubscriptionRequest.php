<?php

namespace App\Models;

use App\Enums\BillingMethod;
use App\Enums\SubscriptionRequestStatus;
use App\Models\Concerns\BelongsToStore;
use App\Models\Concerns\LogsActivity;
use Database\Factories\SubscriptionRequestFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A vendor's request to activate a plan after transferring the payment.
 */
#[Fillable(['plan_id', 'months', 'amount', 'method', 'reference', 'notes'])]
class SubscriptionRequest extends Model
{
    /** @use HasFactory<SubscriptionRequestFactory> */
    use BelongsToStore, HasFactory, LogsActivity;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'months' => 'integer',
            'amount' => 'float',
            'method' => BillingMethod::class,
            'status' => SubscriptionRequestStatus::class,
            'reviewed_at' => 'datetime',
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
     * @return BelongsTo<Plan, $this>
     */
    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    /**
     * @return BelongsTo<Admin, $this>
     */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'reviewed_by');
    }
}
