<?php

namespace App\Models;

use App\Enums\PlanFeature;
use App\Enums\TrackingProvider;
use App\Models\Concerns\BelongsToStore;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A store's account on an ad / analytics platform. The pixel ID is public (the storefront
 * loads it in the browser); the access token, used to send orders from the server, is
 * encrypted and never leaves the backend. The last delivery result is kept so the vendor
 * can see whether tracking works.
 */
#[Fillable(['provider', 'pixel_id', 'access_token', 'test_event_code', 'is_active'])]
#[Hidden(['access_token'])]
class StoreTrackingPixel extends Model
{
    use BelongsToStore;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'provider' => TrackingProvider::class,
            'access_token' => 'encrypted',
            'is_active' => 'boolean',
            'last_sent_at' => 'datetime',
            'last_error_at' => 'datetime',
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
     * Whether orders can be sent from the server: active, with a token, and on a plan that has it.
     */
    public function sendsFromServer(): bool
    {
        return $this->is_active && filled($this->access_token) && $this->store->hasFeature(PlanFeature::ConversionsApi);
    }

    public function recordDelivery(?string $error = null): void
    {
        $this->forceFill($error === null
            ? ['last_sent_at' => now(), 'last_error' => null, 'last_error_at' => null]
            : ['last_error' => mb_substr($error, 0, 500), 'last_error_at' => now()])->save();
    }
}
