<?php

namespace App\Models;

use App\Enums\ProductStatus;
use Database\Factories\ProductFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

/**
 * A catalog item. Price and stock live on its variants: a product without options has a
 * single variant whose option_values is empty, so orders always point at a variant.
 */
#[Fillable(['category_id', 'name', 'slug', 'description', 'status', 'is_featured', 'options'])]
class Product extends Model
{
    /** @use HasFactory<ProductFactory> */
    use HasFactory, SoftDeletes;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => ProductStatus::class,
            'is_featured' => 'boolean',
            'options' => 'array',
        ];
    }

    /**
     * @return BelongsTo<Store, $this>
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /**
     * @return BelongsTo<ProductCategory, $this>
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(ProductCategory::class, 'category_id');
    }

    /**
     * @return HasMany<ProductVariant, $this>
     */
    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class)->orderBy('position')->orderBy('id');
    }

    /**
     * @return HasMany<ProductImage, $this>
     */
    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class)->orderBy('position')->orderBy('id');
    }

    /**
     * Search by product name or variant SKU.
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

        $query->where(function (Builder $query) use ($term): void {
            $query->where('name', 'like', "%{$term}%")
                ->orWhereHas('variants', fn (Builder $query) => $query->where('sku', 'like', "%{$term}%"));
        });
    }

    /**
     * Filter by total stock: "out" (nothing left), "low" (at or under the store's low-stock
     * threshold) or "in".
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function stockLevel(Builder $query, ?string $level): void
    {
        $total = '(select coalesce(sum(stock), 0) from product_variants where product_variants.product_id = products.id)';
        $threshold = '(select low_stock_threshold from stores where stores.id = products.store_id)';

        match ($level) {
            'out' => $query->whereRaw("{$total} = 0"),
            'low' => $query->whereRaw("{$total} between 1 and {$threshold}"),
            'in' => $query->whereRaw("{$total} > {$threshold}"),
            default => null,
        };
    }

    /**
     * Products shoppers can see: published, in a category that is shown in the store.
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function visibleInStore(Builder $query): void
    {
        $query->where('status', ProductStatus::Active)
            ->whereHas('category', fn (Builder $query) => $query->where('is_active', true));
    }

    /**
     * Storefront ordering: "newest" (default), "price_asc" or "price_desc" by the cheapest variant.
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function sortForStorefront(Builder $query, ?string $sort): void
    {
        $cheapestPrice = ProductVariant::query()->select('price')->whereColumn('product_variants.product_id', 'products.id')->orderBy('price')->limit(1);

        match ($sort) {
            'price_asc' => $query->orderBy($cheapestPrice),
            'price_desc' => $query->orderByDesc($cheapestPrice),
            default => $query->latest(),
        };

        $query->latest('id');
    }

    /**
     * URL-friendly slug, unique within the store (Arabic names are transliterated).
     */
    public static function uniqueSlug(int $storeId, string $name, ?int $ignoreId = null): string
    {
        $base = Str::limit(Str::slug($name), 150, '') ?: 'product';
        $slug = $base;

        for ($suffix = 2; static::withTrashed()->where('store_id', $storeId)->where('slug', $slug)->whereKeyNot($ignoreId)->exists(); $suffix++) {
            $slug = "{$base}-{$suffix}";
        }

        return $slug;
    }
}
