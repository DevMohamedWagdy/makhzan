<?php

namespace App\Models;

use App\Enums\OrderStatus;
use App\Models\Concerns\HasPreferredLocale;
use App\Support\PhoneNumber;
use Database\Factories\CustomerFactory;
use Illuminate\Contracts\Translation\HasLocalePreference;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
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
     * Search by name, phone or email.
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function search(Builder $query, ?string $term): void
    {
        $term = trim((string) $term);

        if ($term === '') {
            return;
        }

        $phone = PhoneNumber::normalize($term);

        $query->where(function (Builder $query) use ($term, $phone): void {
            $query->where('full_name', 'like', "%{$term}%")
                ->orWhere('email', 'like', "%{$term}%")
                ->when($phone !== '', fn (Builder $query) => $query->orWhere('phone', 'like', "%{$phone}%"));
        });
    }

    /**
     * Order count, delivered spend and cancelled/returned count, for the vendor's customer views.
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function withOrderStats(Builder $query): void
    {
        $query->withCount([
            'orders',
            'orders as delivered_orders_count' => fn (Builder $query) => $query->where('status', OrderStatus::Delivered),
            'orders as failed_orders_count' => fn (Builder $query) => $query->whereIn('status', [OrderStatus::Cancelled, OrderStatus::Returned]),
        ])->withSum(['orders as total_spent' => fn (Builder $query) => $query->where('status', OrderStatus::Delivered)], 'total');
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
