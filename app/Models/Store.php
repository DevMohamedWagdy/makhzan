<?php

namespace App\Models;

use App\Enums\PaymentMethod;
use App\Enums\PlanFeature;
use App\Models\Concerns\LogsActivity;
use Database\Factories\StoreFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\Storage;

#[Fillable([
    'name', 'slug', 'logo_path', 'governorate_id', 'city_id', 'low_stock_threshold', 'description',
    'contact_phone', 'whatsapp', 'contact_email', 'address', 'facebook_url', 'instagram_url', 'tiktok_url',
    'announcement', 'accepting_orders', 'closed_message', 'min_order_total', 'cod_enabled', 'return_policy', 'shipping_policy', 'privacy_policy', 'terms',
])]
class Store extends Model
{
    /** @use HasFactory<StoreFactory> */
    use HasFactory, LogsActivity;

    /** @var list<string> Attributes not worth an activity log entry. */
    protected array $activityIgnored = ['trial_ends_at_reminded'];

    /** Storefront policy pages, by URL key => column. */
    public const POLICIES = [
        'returns' => 'return_policy',
        'shipping' => 'shipping_policy',
        'privacy' => 'privacy_policy',
        'terms' => 'terms',
    ];

    /**
     * Every store starts with a main warehouse, which holds its stock until others are added.
     */
    protected static function booted(): void
    {
        static::creating(function (Store $store): void {
            $store->trial_ends_at ??= now()->addDays(config('makhzan.billing.trial_days'));
        });

        static::created(function (Store $store): void {
            $store->warehouses()->create(['name' => Warehouse::DEFAULT_NAME, 'priority' => 1]);
        });
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'default_shipping_price' => 'float',
            'free_shipping_threshold' => 'float',
            'low_stock_threshold' => 'integer',
            'accepting_orders' => 'boolean',
            'min_order_total' => 'float',
            'cod_enabled' => 'boolean',
            'plan_expires_at' => 'datetime',
            'trial_ends_at' => 'datetime',
            'suspended_at' => 'datetime',
            'custom_domain_verified_at' => 'datetime',
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
     * Roles the owner gives staff.
     *
     * @return HasMany<StoreRole, $this>
     */
    public function roles(): HasMany
    {
        return $this->hasMany(StoreRole::class);
    }

    /**
     * The paid plan, whether or not it is still current (see currentPlan()).
     *
     * @return BelongsTo<Plan, $this>
     */
    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    /**
     * @return HasMany<SubscriptionPayment, $this>
     */
    public function subscriptionPayments(): HasMany
    {
        return $this->hasMany(SubscriptionPayment::class);
    }

    /**
     * @return HasMany<SubscriptionRequest, $this>
     */
    public function subscriptionRequests(): HasMany
    {
        return $this->hasMany(SubscriptionRequest::class);
    }

    public function hasActiveSubscription(): bool
    {
        return $this->plan_id !== null && $this->plan_expires_at?->isFuture();
    }

    /**
     * Stores without a paid plan in effect (on trial, expired, or never subscribed).
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function withoutActiveSubscription(Builder $query): void
    {
        $query->where(fn (Builder $query) => $query->whereNull('plan_id')->orWhereNull('plan_expires_at')->orWhere('plan_expires_at', '<=', now()));
    }

    public function isOnTrial(): bool
    {
        return ! $this->hasActiveSubscription() && (bool) $this->trial_ends_at?->isFuture();
    }

    /**
     * active: a paid plan; trial: full access until trial_ends_at; expired: must subscribe;
     * unrestricted: the platform has no plans yet, so nothing is limited.
     *
     * @return 'active'|'trial'|'expired'|'unrestricted'
     */
    public function billingStatus(): string
    {
        return match (true) {
            $this->hasActiveSubscription() => 'active',
            $this->isOnTrial() => 'trial',
            ! Plan::query()->exists() => 'unrestricted',
            default => 'expired',
        };
    }

    /**
     * Where the store stands with billing, for the dashboard banner and admin views.
     *
     * @return array{status: string, plan: array{plan_id: int, name: string}|null, plan_expires_at: string|null, trial_ends_at: string|null, days_left: int|null}
     */
    public function billingSummary(): array
    {
        $status = $this->billingStatus();
        $endsAt = match ($status) {
            'active' => $this->plan_expires_at,
            'trial' => $this->trial_ends_at,
            default => null,
        };

        return [
            'status' => $status,
            'plan' => $status === 'active' ? ['plan_id' => $this->plan->id, 'name' => $this->plan->name] : null,
            'plan_expires_at' => $status === 'active' ? $this->plan_expires_at->toIso8601String() : null,
            'trial_ends_at' => $this->trial_ends_at?->toIso8601String(),
            'days_left' => $endsAt ? max(0, (int) ceil(now()->diffInHours($endsAt) / 24)) : null,
        ];
    }

    public function hasBillingAccess(): bool
    {
        return $this->billingStatus() !== 'expired';
    }

    /**
     * The paid plan in effect, or null during a trial or after it ends.
     */
    public function currentPlan(): ?Plan
    {
        return $this->hasActiveSubscription() ? $this->plan : null;
    }

    /**
     * Trials (and a platform without plans) include everything; a paid plan its features.
     */
    public function hasFeature(PlanFeature $feature): bool
    {
        return match ($this->billingStatus()) {
            'active' => $this->plan->includes($feature),
            'expired' => false,
            default => true,
        };
    }

    /**
     * Whether the plan leaves room for one more product (soft-deleted ones don't count).
     */
    public function canAddProduct(): bool
    {
        return $this->withinLimit($this->currentPlan()?->max_products, fn (): int => $this->products()->count());
    }

    public function canAddStaff(): bool
    {
        return $this->withinLimit($this->currentPlan()?->max_staff, fn (): int => $this->staff()->count());
    }

    /**
     * Whether checkout is open: the vendor's own switch, and a trial or subscription.
     */
    public function takesOrders(): bool
    {
        return $this->accepting_orders && $this->hasBillingAccess();
    }

    /**
     * What shoppers see while checkout is closed.
     */
    public function closedMessage(): string
    {
        return $this->hasBillingAccess() ? ($this->closed_message ?: __('settings.store_closed')) : __('billing.store_unavailable');
    }

    /**
     * @param  callable(): int  $count
     */
    private function withinLimit(?int $limit, callable $count): bool
    {
        return match ($this->billingStatus()) {
            'active' => $limit === null || $count() < $limit,
            'expired' => false,
            default => true,
        };
    }

    public function isSuspended(): bool
    {
        return $this->suspended_at !== null;
    }

    /**
     * Staff accounts working in this store (the owner is `vendor`).
     *
     * @return HasMany<Vendor, $this>
     */
    public function staff(): HasMany
    {
        return $this->hasMany(Vendor::class, 'store_id');
    }

    /**
     * @return HasMany<Affiliate, $this>
     */
    public function affiliates(): HasMany
    {
        return $this->hasMany(Affiliate::class);
    }

    /**
     * @return HasMany<ProductCategory, $this>
     */
    public function productCategories(): HasMany
    {
        return $this->hasMany(ProductCategory::class)->orderBy('position')->orderBy('id');
    }

    /**
     * @return HasMany<Product, $this>
     */
    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    /**
     * @return HasMany<ShippingRate, $this>
     */
    public function shippingRates(): HasMany
    {
        return $this->hasMany(ShippingRate::class);
    }

    /**
     * @return HasMany<Customer, $this>
     */
    public function customers(): HasMany
    {
        return $this->hasMany(Customer::class);
    }

    /**
     * @return HasMany<Order, $this>
     */
    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    /**
     * Warehouses in fulfilment order: orders take stock from the first one that has it.
     *
     * @return HasMany<Warehouse, $this>
     */
    public function warehouses(): HasMany
    {
        return $this->hasMany(Warehouse::class)->orderBy('priority')->orderBy('id');
    }

    /**
     * Where restocks, new products and purchase orders go unless told otherwise.
     */
    public function defaultWarehouse(): Warehouse
    {
        return $this->warehouses()->first() ?? $this->warehouses()->create(['name' => Warehouse::DEFAULT_NAME, 'priority' => 1]);
    }

    /**
     * @return HasMany<Coupon, $this>
     */
    public function coupons(): HasMany
    {
        return $this->hasMany(Coupon::class);
    }

    /**
     * @return HasMany<StockTransfer, $this>
     */
    public function stockTransfers(): HasMany
    {
        return $this->hasMany(StockTransfer::class);
    }

    /**
     * @return HasMany<Supplier, $this>
     */
    public function suppliers(): HasMany
    {
        return $this->hasMany(Supplier::class);
    }

    /**
     * @return HasMany<PurchaseOrder, $this>
     */
    public function purchaseOrders(): HasMany
    {
        return $this->hasMany(PurchaseOrder::class);
    }

    /**
     * @return HasMany<StockMovement, $this>
     */
    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    /**
     * Delivery price to a governorate for an order of this subtotal; null when the store
     * doesn't deliver there. Free above the store's threshold.
     */
    public function shippingFeeFor(string $governorateId, float $subtotal): ?float
    {
        $rates = $this->relationLoaded('shippingRates') ? $this->shippingRates : $this->shippingRates()->get();
        $rate = $rates->firstWhere('governorate_id', $governorateId);
        $price = $rate ? ($rate->is_enabled ? ($rate->price ?? $this->default_shipping_price) : null) : $this->default_shipping_price;

        if ($price === null) {
            return null;
        }

        return $this->free_shipping_threshold !== null && $subtotal >= $this->free_shipping_threshold ? 0.0 : (float) $price;
    }

    /**
     * The store's Paymob account, when it has connected one.
     *
     * @return HasOne<StorePaymentGateway, $this>
     */
    public function paymentGateway(): HasOne
    {
        return $this->hasOne(StorePaymentGateway::class)->where('gateway', StorePaymentGateway::PAYMOB);
    }

    /**
     * Ways customers can pay at checkout: cash on delivery (unless turned off) and whatever
     * the connected gateway is set up for, when the plan includes online payments.
     *
     * @return list<PaymentMethod>
     */
    public function paymentMethods(): array
    {
        $gateway = $this->relationLoaded('paymentGateway') ? $this->paymentGateway : $this->paymentGateway()->first();

        return [
            ...($this->cod_enabled ? [PaymentMethod::Cod] : []),
            ...($this->hasFeature(PlanFeature::OnlinePayments) ? ($gateway?->methods() ?? []) : []),
        ];
    }

    /**
     * The store's Bosta account, when it has connected one.
     *
     * @return HasOne<StoreShippingAccount, $this>
     */
    public function bostaAccount(): HasOne
    {
        return $this->hasOne(StoreShippingAccount::class)->where('carrier', StoreShippingAccount::BOSTA);
    }

    /**
     * @return HasOne<AffiliateRegistrationLink, $this>
     */
    public function affiliateRegistrationLink(): HasOne
    {
        return $this->hasOne(AffiliateRegistrationLink::class);
    }

    /**
     * Public storefront URL, e.g. https://makhzan.app/noor-fashion (see makhzan.storefront_url),
     * or the store's own verified domain.
     */
    public function storefrontUrl(string $path = ''): string
    {
        if ($this->custom_domain && $this->custom_domain_verified_at) {
            return 'https://'.$this->custom_domain.($path === '' || str_starts_with($path, '?') ? '/'.$path : $path);
        }

        return config('makhzan.storefront_url').'/'.$this->slug.$path;
    }

    /**
     * Returns the store's registration link, creating the default one on first access.
     */
    public function registrationLink(): AffiliateRegistrationLink
    {
        $link = $this->affiliateRegistrationLink()->firstOrCreate([], [
            'token' => AffiliateRegistrationLink::generateToken(),
        ]);

        // Lazy creation is an implementation detail of reading: responses stay 200, not 201.
        $link->wasRecentlyCreated = false;

        return $link;
    }

    /**
     * @return Attribute<string|null, never>
     */
    protected function logoUrl(): Attribute
    {
        return Attribute::get(fn (): ?string => $this->logo_path ? Storage::disk('public')->url($this->logo_path) : null);
    }

    /**
     * Platform actions on a store get their own event names.
     *
     * @param  array<string, mixed>  $changed
     */
    public function activityEvent(string $default, array $changed): string
    {
        return match (true) {
            array_key_exists('suspended_at', $changed) => $changed['suspended_at'] ? 'suspended' : 'unsuspended',
            array_key_exists('plan_expires_at', $changed) => 'subscription_changed',
            array_key_exists('trial_ends_at', $changed) => 'trial_changed',
            array_key_exists('custom_domain_verified_at', $changed) && $changed['custom_domain_verified_at'] => 'domain_verified',
            default => $default,
        };
    }
}
