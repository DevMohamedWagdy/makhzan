<?php

namespace App\Models;

use App\Models\Concerns\HasPreferredLocale;
use App\Models\Concerns\LogsActivity;
use App\Notifications\StoreAlertNotification;
use App\Notifications\VendorResetPasswordNotification;
use App\Support\StorePermissions;
use Database\Factories\VendorFactory;
use Illuminate\Contracts\Translation\HasLocalePreference;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Http\Request;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;
use Laravel\Sanctum\HasApiTokens;

/**
 * A dashboard account: either a store owner (owns a store through stores.vendor_id) or a staff
 * member working in another vendor's store (store_id) with a role's permissions.
 */
#[Fillable(['full_name', 'job_title', 'phone', 'email', 'password', 'role_id', 'is_active'])]
#[Hidden(['password', 'remember_token'])]
class Vendor extends Authenticatable implements HasLocalePreference
{
    /** Ability granted to vendor dashboard tokens. */
    public const TOKEN_ABILITY = 'vendor';

    /** @use HasFactory<VendorFactory> */
    use HasApiTokens, HasFactory, HasPreferredLocale, LogsActivity, Notifiable;

    /** @var list<string> Attributes not worth an activity log entry. */
    protected array $activityIgnored = ['last_login_at', 'preferred_locale'];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'is_active' => 'boolean',
            'last_login_at' => 'datetime',
        ];
    }

    /**
     * The store this account works in: the owned store, or the employer's for staff.
     *
     * Eager loading builds the relation from a blank model (an owner), so load a staff
     * member's store lazily or through withStore().
     *
     * @return HasOne<Store, $this>|BelongsTo<Store, $this>
     */
    public function store(): HasOne|BelongsTo
    {
        return $this->store_id ? $this->belongsTo(Store::class, 'store_id') : $this->hasOne(Store::class);
    }

    /**
     * The store an owner owns (eager-loadable, unlike store() for mixed lists).
     *
     * @return HasOne<Store, $this>
     */
    public function ownedStore(): HasOne
    {
        return $this->hasOne(Store::class);
    }

    /**
     * The store a staff member works in.
     *
     * @return BelongsTo<Store, $this>
     */
    public function employer(): BelongsTo
    {
        return $this->belongsTo(Store::class, 'store_id');
    }

    /**
     * Loads the store for owners and staff alike, e.g. before returning a VendorResource.
     */
    public function withStore(): static
    {
        return $this->setRelation('store', $this->store()->first());
    }

    public function isOwner(): bool
    {
        return $this->store_id === null;
    }

    /**
     * @return BelongsTo<StoreRole, $this>
     */
    public function role(): BelongsTo
    {
        return $this->belongsTo(StoreRole::class, 'role_id');
    }

    /**
     * A "section.action" permission (see StorePermissions); owners hold all of them.
     */
    public function hasPermission(string $permission): bool
    {
        return $this->isOwner() || (bool) $this->role?->allows($permission);
    }

    /**
     * Permissions the account holds; owners hold all of them.
     *
     * @return list<string>
     */
    public function grantedPermissions(): array
    {
        return $this->isOwner() ? StorePermissions::all() : array_values(array_intersect(StorePermissions::all(), $this->role?->permissions ?? []));
    }

    /**
     * The notification types this account may see in the shared inbox, from its role; null
     * for the owner, who sees them all.
     *
     * @return list<string>|null
     */
    public function visibleNotificationTypes(): ?array
    {
        if ($this->isOwner()) {
            return null;
        }

        return collect(StorePermissions::NOTIFICATIONS)
            ->filter(fn (array $permissions): bool => collect($permissions)->contains(fn (string $permission): bool => $this->hasPermission($permission)))
            ->keys()
            ->all();
    }

    /**
     * Tells the owner about a sign-in from a browser this account hasn't signed in from before
     * (going by earlier sign-ins in the activity log). The very first sign-in isn't announced.
     */
    public function notifyIfNewDevice(Request $request): void
    {
        if (! $this->isOwner()) {
            return;
        }

        $signIns = ActivityLog::query()->where('event', 'vendor.login')->where('actor_type', 'vendor')->where('actor_id', $this->id);
        $userAgent = Str::limit((string) $request->userAgent(), 250, '');

        if ($signIns->exists() && ! (clone $signIns)->where('user_agent', $userAgent)->exists()) {
            $this->notify(new StoreAlertNotification(StoreAlertNotification::NEW_SIGN_IN, $this->signInDetails($request)));
        }
    }

    /**
     * Tells the owner their password was changed (from the account page or a reset link).
     */
    public function notifyPasswordChanged(Request $request): void
    {
        if ($this->isOwner()) {
            $this->notify(new StoreAlertNotification(StoreAlertNotification::PASSWORD_CHANGED, $this->signInDetails($request)));
        }
    }

    /**
     * @return array{device: string, ip: string|null, at: string}
     */
    private function signInDetails(Request $request): array
    {
        return ['device' => StoreAlertNotification::deviceLabel($request->userAgent()), 'ip' => $request->ip(), 'at' => now()->toIso8601String()];
    }

    /**
     * The account whose bell holds the store's notifications (the owner's), shared with staff.
     */
    public function notificationInbox(): self
    {
        return $this->isOwner() ? $this : $this->store->vendor;
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
