<?php

namespace App\Models;

use App\Enums\PaymentMethod;
use App\Models\Concerns\BelongsToStore;
use App\Models\Concerns\LogsActivity;
use Database\Factories\StorePaymentGatewayFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A store's account with an online payment provider. Credentials are encrypted at rest and
 * never leave the server; customers pay the vendor's account directly.
 */
#[Fillable(['gateway', 'credentials', 'is_live', 'verified_at'])]
#[Hidden(['credentials'])]
class StorePaymentGateway extends Model
{
    /** @use HasFactory<StorePaymentGatewayFactory> */
    use BelongsToStore, HasFactory, LogsActivity;

    public const PAYMOB = 'paymob';

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'credentials' => 'encrypted:array',
            'is_live' => 'boolean',
            'verified_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Store, $this>
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function credential(string $key): ?string
    {
        $value = $this->credentials[$key] ?? null;

        return filled($value) ? (string) $value : null;
    }

    /**
     * The gateway's integration id for a payment method, or null when it isn't set up.
     */
    public function integrationIdFor(PaymentMethod $method): ?string
    {
        return match ($method) {
            PaymentMethod::Card => $this->credential('card_integration_id'),
            PaymentMethod::Wallet => $this->credential('wallet_integration_id'),
            PaymentMethod::Cod => null,
        };
    }

    /**
     * Online methods customers can pay with through this gateway.
     *
     * @return list<PaymentMethod>
     */
    public function methods(): array
    {
        return array_values(array_filter([PaymentMethod::Card, PaymentMethod::Wallet], fn (PaymentMethod $method): bool => $this->integrationIdFor($method) !== null));
    }
}
