<?php

namespace App\Models;

use App\Models\Concerns\BelongsToStore;
use Database\Factories\ShippingRateFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A store's delivery setting for one governorate: its own price, the store default
 * (null price) or no delivery (disabled). Saved all at once from the shipping page, which logs
 * one "store.shipping_updated" entry for the lot.
 */
#[Fillable(['governorate_id', 'price', 'is_enabled'])]
class ShippingRate extends Model
{
    /** @use HasFactory<ShippingRateFactory> */
    use BelongsToStore, HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'price' => 'float',
            'is_enabled' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<Store, $this>
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }
}
