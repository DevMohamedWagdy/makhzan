<?php

namespace App\Models;

use App\Enums\BillingMethod;
use App\Models\Concerns\BelongsToStore;
use App\Models\Concerns\LogsActivity;
use Database\Factories\SubscriptionPaymentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A payment a platform admin recorded, activating a plan from starts_at to ends_at.
 */
#[Fillable(['store_id', 'plan_id', 'plan_name', 'amount', 'months', 'method', 'reference', 'notes', 'starts_at', 'ends_at', 'recorded_by'])]
class SubscriptionPayment extends Model
{
    /** @use HasFactory<SubscriptionPaymentFactory> */
    use BelongsToStore, HasFactory, LogsActivity;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount' => 'float',
            'months' => 'integer',
            'method' => BillingMethod::class,
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
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
    public function recorder(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'recorded_by');
    }
}
