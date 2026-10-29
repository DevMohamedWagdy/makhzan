<?php

namespace App\Models;

use App\Enums\PaymentMethod;
use App\Models\Concerns\LogsActivity;
use Database\Factories\StoreFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Collection;
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
            'loyalty_enabled' => 'boolean',
            'loyalty_earn_rate' => 'integer',
            'loyalty_point_value' => 'float',
            'loyalty_min_redeem' => 'integer',
            'loyalty_tiers' => 'array',
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
     * Whether customers earn and spend points: switched on by the vendor.
     */
    public function loyaltyActive(): bool
    {
        return (bool) $this->loyalty_enabled;
    }

    /**
     * Points a delivered order earns: the earn rate per 100 EGP of products actually paid for
     * (after coupon and points discounts), times the customer's tier multiplier, rounded down.
     */
    public function pointsFor(float $amount, float $multiplier = 1): int
    {
        return max(0, (int) floor(round($amount * $this->loyalty_earn_rate * $multiplier / 100, 6)));
    }

    /**
     * The customer tiers the vendor set up, lowest spend first.
     *
     * @return list<array{name: string, min_spend: float, multiplier: float}>
     */
    public function loyaltyTiers(): array
    {
        return collect($this->loyalty_tiers ?? [])
            ->map(fn (array $tier): array => ['name' => (string) $tier['name'], 'min_spend' => (float) $tier['min_spend'], 'multiplier' => (float) $tier['multiplier']])
            ->sortBy('min_spend')
            ->values()
            ->all();
    }

    /**
     * The highest tier a customer who has spent $spent on delivered orders has reached, if any.
     *
     * @return array{name: string, min_spend: float, multiplier: float}|null
     */
    public function tierFor(float $spent): ?array
    {
        return collect($this->loyaltyTiers())->last(fn (array $tier): bool => $spent >= $tier['min_spend']);
    }

    /**
     * Where a customer stands among the tiers: their tier, the next one, how much more they
     * need to spend to reach it and how far along they are (0–100). Null without tiers.
     *
     * @return array{spent: float, current: array{name: string, min_spend: float, multiplier: float}|null, next: array{name: string, min_spend: float, multiplier: float}|null, remaining: float|null, progress: int, tiers: list<array{name: string, min_spend: float, multiplier: float}>}|null
     */
    public function tierProgress(float $spent): ?array
    {
        $tiers = $this->loyaltyTiers();

        if ($tiers === []) {
            return null;
        }

        $current = $this->tierFor($spent);
        $next = collect($tiers)->first(fn (array $tier): bool => $spent < $tier['min_spend']);
        $floor = $current['min_spend'] ?? 0;

        return [
            'spent' => round($spent, 2),
            'current' => $current,
            'next' => $next,
            'remaining' => $next ? round($next['min_spend'] - $spent, 2) : null,
            'progress' => $next ? (int) floor(($spent - $floor) / max(0.01, $next['min_spend'] - $floor) * 100) : 100,
            'tiers' => $tiers,
        ];
    }

    /**
     * Whether checkout is open: the vendor's own switch.
     */
    public function takesOrders(): bool
    {
        return (bool) $this->accepting_orders;
    }

    /**
     * What shoppers see while checkout is closed.
     */
    public function closedMessage(): string
    {
        return $this->closed_message ?: __('settings.store_closed');
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
     * The owner and the active team members, the owner first: the accounts that can be sent things
     * like the emailed sales report.
     *
     * @return Collection<int, Vendor>
     */
    public function activeAccounts(): Collection
    {
        return collect([$this->vendor])->merge($this->staff()->where('is_active', true)->orderBy('full_name')->get())->filter()->values();
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
     * @return HasMany<ProductCollection, $this>
     */
    public function productCollections(): HasMany
    {
        return $this->hasMany(ProductCollection::class)->orderBy('position')->orderBy('id');
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
     * @return HasMany<ProductReview, $this>
     */
    public function productReviews(): HasMany
    {
        return $this->hasMany(ProductReview::class);
    }

    /**
     * @return HasMany<StoreTrackingPixel, $this>
     */
    public function trackingPixels(): HasMany
    {
        return $this->hasMany(StoreTrackingPixel::class);
    }

    /**
     * @return HasMany<LoyaltyTransaction, $this>
     */
    public function loyaltyTransactions(): HasMany
    {
        return $this->hasMany(LoyaltyTransaction::class);
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
     * @return HasMany<PurchaseReturn, $this>
     */
    public function purchaseReturns(): HasMany
    {
        return $this->hasMany(PurchaseReturn::class);
    }

    /**
     * @return HasMany<SupplierPayment, $this>
     */
    public function supplierPayments(): HasMany
    {
        return $this->hasMany(SupplierPayment::class);
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
     * the connected gateway is set up for.
     *
     * @return list<PaymentMethod>
     */
    public function paymentMethods(): array
    {
        $gateway = $this->relationLoaded('paymentGateway') ? $this->paymentGateway : $this->paymentGateway()->first();

        return [
            ...($this->cod_enabled ? [PaymentMethod::Cod] : []),
            ...($gateway?->methods() ?? []),
        ];
    }

    /**
     * @return HasOne<AffiliateRegistrationLink, $this>
     */
    public function affiliateRegistrationLink(): HasOne
    {
        return $this->hasOne(AffiliateRegistrationLink::class);
    }

    /**
     * Public storefront URL, e.g. https://sellygrow.com/noor-fashion (see makhzan.storefront_url),
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
            array_key_exists('custom_domain_verified_at', $changed) && $changed['custom_domain_verified_at'] => 'domain_verified',
            default => $default,
        };
    }
}
