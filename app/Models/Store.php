<?php

namespace App\Models;

use Database\Factories\StoreFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\Storage;

#[Fillable(['name', 'slug', 'logo_path', 'governorate_id', 'city_id', 'low_stock_threshold'])]
class Store extends Model
{
    /** @use HasFactory<StoreFactory> */
    use HasFactory;

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
     * @return HasOne<AffiliateRegistrationLink, $this>
     */
    public function affiliateRegistrationLink(): HasOne
    {
        return $this->hasOne(AffiliateRegistrationLink::class);
    }

    /**
     * Public storefront URL, e.g. https://makhzan.app/noor-fashion (see makhzan.storefront_url).
     */
    public function storefrontUrl(string $path = ''): string
    {
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
}
