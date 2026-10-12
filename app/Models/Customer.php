<?php

namespace App\Models;

use App\Models\Concerns\HasPreferredLocale;
use Database\Factories\CustomerFactory;
use Illuminate\Contracts\Translation\HasLocalePreference;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/**
 * A shopper's account in one store (the same phone can have accounts in several stores).
 */
#[Fillable(['full_name', 'phone', 'email', 'password'])]
#[Hidden(['password', 'remember_token'])]
class Customer extends Authenticatable implements HasLocalePreference
{
    /** Ability granted to storefront customer tokens. */
    public const TOKEN_ABILITY = 'customer';

    /** @use HasFactory<CustomerFactory> */
    use HasApiTokens, HasFactory, HasPreferredLocale, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'last_order_at' => 'datetime',
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
     * @return HasMany<CustomerAddress, $this>
     */
    public function addresses(): HasMany
    {
        return $this->hasMany(CustomerAddress::class)->orderByDesc('is_default')->latest('id');
    }

    /**
     * @return HasMany<Order, $this>
     */
    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    /**
     * Issues a storefront token. "Remember me" sessions last 30 days, others a day.
     */
    public function issueToken(bool $remember): string
    {
        $expiresAt = $remember ? now()->addDays(30) : now()->addDay();

        return $this->createToken('storefront', [self::TOKEN_ABILITY], $expiresAt)->plainTextToken;
    }
}
