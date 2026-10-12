<?php

namespace App\Models;

use App\Enums\AffiliateTier;
use Database\Factories\AffiliateRegistrationLinkFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

#[Fillable(['token', 'is_enabled', 'auto_approve', 'default_tier'])]
class AffiliateRegistrationLink extends Model
{
    /** @use HasFactory<AffiliateRegistrationLinkFactory> */
    use HasFactory;

    /**
     * Mirrors the column defaults so a freshly created link serializes correctly.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'is_enabled' => true,
        'auto_approve' => false,
        'default_tier' => 'new',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_enabled' => 'boolean',
            'auto_approve' => 'boolean',
            'default_tier' => AffiliateTier::class,
        ];
    }

    /**
     * @return BelongsTo<Store, $this>
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public static function generateToken(): string
    {
        return Str::random(12);
    }

    /**
     * Invalidates the current public link by issuing a new token.
     */
    public function regenerate(): void
    {
        $this->update(['token' => static::generateToken()]);
    }
}
