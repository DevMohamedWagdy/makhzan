<?php

namespace App\Models;

use App\Models\Concerns\BelongsToStore;
use Database\Factories\AffiliateReferralCodeFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

#[Fillable(['store_id', 'code', 'is_active'])]
class AffiliateReferralCode extends Model
{
    /** @use HasFactory<AffiliateReferralCodeFactory> */
    use BelongsToStore, HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'clicks' => 'integer',
            'orders' => 'integer',
            'is_active' => 'boolean',
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
     * Unique, human-friendly code such as MK5039H3 (no ambiguous characters).
     */
    public static function generateCode(int $affiliateId): string
    {
        do {
            $code = 'MK'.$affiliateId.Str::upper(Str::random(3));
            $code = strtr($code, ['O' => 'P', '0' => '2', 'I' => 'J', '1' => '3', 'L' => 'M']);
        } while (static::query()->where('code', $code)->exists());

        return $code;
    }
}
