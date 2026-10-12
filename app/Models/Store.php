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

#[Fillable(['name', 'slug', 'logo_path', 'governorate_id', 'city_id'])]
class Store extends Model
{
    /** @use HasFactory<StoreFactory> */
    use HasFactory;

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
