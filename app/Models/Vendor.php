<?php

namespace App\Models;

use App\Models\Concerns\HasPreferredLocale;
use App\Notifications\VendorResetPasswordNotification;
use Database\Factories\VendorFactory;
use Illuminate\Contracts\Translation\HasLocalePreference;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['full_name', 'phone', 'email', 'password'])]
#[Hidden(['password', 'remember_token'])]
class Vendor extends Authenticatable implements HasLocalePreference
{
    /** Ability granted to vendor dashboard tokens. */
    public const TOKEN_ABILITY = 'vendor';

    /** @use HasFactory<VendorFactory> */
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
        ];
    }

    /**
     * @return HasOne<Store, $this>
     */
    public function store(): HasOne
    {
        return $this->hasOne(Store::class);
    }

    /**
     * @return HasMany<Affiliate, $this>
     */
    public function affiliates(): HasMany
    {
        return $this->hasMany(Affiliate::class);
    }

    /**
     * Issues a dashboard API token. "Remember me" sessions last 30 days, others 12 hours.
     */
    public function issueToken(bool $remember): string
    {
        $expiresAt = $remember ? now()->addDays(30) : now()->addHours(12);

        return $this->createToken('vendor-dashboard', [self::TOKEN_ABILITY], $expiresAt)->plainTextToken;
    }

    /**
     * The reset link points at the SPA, not a Blade route.
     *
     * @param  string  $token
     */
    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new VendorResetPasswordNotification($token));
    }
}
