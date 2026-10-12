<?php

namespace App\Models;

use App\Enums\AffiliateSource;
use App\Enums\AffiliateStatus;
use App\Enums\AffiliateTier;
use App\Enums\CommissionType;
use App\Enums\PayoutMethod;
use App\Support\PhoneNumber;
use Database\Factories\AffiliateFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\HasApiTokens;

#[Fillable([
    'full_name', 'phone', 'email', 'password', 'avatar_path', 'status', 'tier', 'source',
    'payout_type', 'payout_account_name', 'payout_account_number', 'payout_bank_name', 'payout_iban',
])]
#[Hidden(['password', 'remember_token', 'payout_account_number', 'payout_iban'])]
class Affiliate extends Authenticatable
{
    /** Ability granted to the affiliate's own portal tokens. */
    public const TOKEN_ABILITY = 'affiliate';

    /** Ability granted to a vendor's read-only "login as affiliate" tokens. */
    public const IMPERSONATION_ABILITY = 'affiliate:impersonated';

    /** @use HasFactory<AffiliateFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'status' => AffiliateStatus::class,
            'tier' => AffiliateTier::class,
            'source' => AffiliateSource::class,
            'payout_type' => PayoutMethod::class,
            'payout_account_number' => 'encrypted',
            'payout_iban' => 'encrypted',
            'commission_type' => CommissionType::class,
            'commission_value' => 'float',
            'orders_count' => 'integer',
            'sales_total' => 'float',
            'earned_commission' => 'float',
            'pending_balance' => 'float',
            'frozen_at' => 'datetime',
            'last_active_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Vendor, $this>
     */
    public function vendor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class);
    }

    /**
     * @return BelongsTo<Store, $this>
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /**
     * @return HasMany<AffiliateReferralCode, $this>
     */
    public function referralCodes(): HasMany
    {
        return $this->hasMany(AffiliateReferralCode::class);
    }

    /**
     * Search by name, phone, email or referral code.
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
                ->when($phone !== '', fn (Builder $query) => $query->orWhere('phone', 'like', "%{$phone}%"))
                ->orWhereHas('referralCodes', fn (Builder $query) => $query->where('code', 'like', "%{$term}%"));
        });
    }

    /**
     * @return Attribute<string|null, never>
     */
    protected function avatarUrl(): Attribute
    {
        return Attribute::get(fn (): ?string => $this->avatar_path ? Storage::disk('public')->url($this->avatar_path) : null);
    }

    /**
     * Issues a portal token. "Remember me" sessions last 30 days, others 12 hours.
     */
    public function issueToken(bool $remember): string
    {
        $expiresAt = $remember ? now()->addDays(30) : now()->addHours(12);

        return $this->createToken('affiliate-portal', [self::TOKEN_ABILITY], $expiresAt)->plainTextToken;
    }

    /**
     * Commission in effect: the custom override if set, otherwise the tier default.
     *
     * @return array{type: CommissionType, value: float, note: string|null, is_custom: bool}
     */
    public function effectiveCommission(): array
    {
        if ($this->commission_type !== null) {
            return ['type' => $this->commission_type, 'value' => $this->commission_value, 'note' => $this->commission_note, 'is_custom' => true];
        }

        return ['type' => CommissionType::Percentage, 'value' => $this->tier->defaultCommission(), 'note' => null, 'is_custom' => false];
    }

    public function setCommissionOverride(?CommissionType $type, ?float $value = null, ?string $note = null): void
    {
        $this->forceFill([
            'commission_type' => $type,
            'commission_value' => $type ? $value : null,
            'commission_note' => $type ? $note : null,
        ])->save();
    }

    public function createReferralCode(): AffiliateReferralCode
    {
        return $this->referralCodes()->create([
            'store_id' => $this->store_id,
            'code' => AffiliateReferralCode::generateCode($this->id),
            'is_active' => $this->status === AffiliateStatus::Active,
        ]);
    }

    /**
     * Suspends the account without touching historical records: referral links stop
     * working and any open sessions (including impersonation) are revoked.
     */
    public function freeze(?string $reason): void
    {
        DB::transaction(function () use ($reason): void {
            $this->forceFill([
                'status' => AffiliateStatus::Frozen,
                'frozen_reason' => $reason,
                'frozen_at' => now(),
            ])->save();

            $this->referralCodes()->update(['is_active' => false]);
            $this->tokens()->delete();
        });
    }

    /**
     * Activates a frozen account or approves a pending applicant.
     */
    public function activate(): void
    {
        DB::transaction(function (): void {
            $this->forceFill([
                'status' => AffiliateStatus::Active,
                'frozen_reason' => null,
                'frozen_at' => null,
            ])->save();

            $this->referralCodes()->update(['is_active' => true]);

            if (! $this->referralCodes()->exists()) {
                $this->createReferralCode();
            }
        });
    }
}
