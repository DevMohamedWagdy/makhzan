<?php

namespace App\Models;

use App\Models\Concerns\BelongsToStore;
use App\Models\Concerns\LogsActivity;
use Database\Factories\StoreShippingAccountFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

/**
 * A store's account with a shipping company. The API key never leaves the server; the
 * webhook secret is generated here and sent with each shipment so status updates can be
 * verified.
 */
#[Fillable(['carrier', 'credentials', 'settings', 'verified_at'])]
#[Hidden(['credentials'])]
class StoreShippingAccount extends Model
{
    /** @use HasFactory<StoreShippingAccountFactory> */
    use BelongsToStore, HasFactory, LogsActivity;

    public const BOSTA = 'bosta';

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'credentials' => 'encrypted:array',
            'settings' => 'array',
            'verified_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (StoreShippingAccount $account): void {
            $account->credentials = ['webhook_secret' => Str::random(40), ...($account->credentials ?? [])];
        });
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

    public function setting(string $key, mixed $default = null): mixed
    {
        return $this->settings[$key] ?? $default;
    }
}
