<?php

namespace App\Models;

use App\Models\Concerns\LogsActivity;
use Database\Factories\ProductVariantFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A purchasable combination of a product's options (e.g. أحمر / L) with its own price,
 * SKU and stock. Stock changes go through App\Actions\Inventory\ChangeStock so each one is logged.
 */
#[Fillable(['option_values', 'sku', 'price', 'compare_at_price', 'cost', 'stock', 'low_stock_threshold', 'position'])]
class ProductVariant extends Model
{
    /** @use HasFactory<ProductVariantFactory> */
    use HasFactory, LogsActivity;

    /** @var list<string> Attributes not worth an activity log entry. */
    protected array $activityIgnored = ['stock', 'position'];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'option_values' => 'array',
            'price' => 'float',
            'compare_at_price' => 'float',
            'cost' => 'float',
            'stock' => 'integer',
            'low_stock_threshold' => 'integer',
            'position' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Product, $this>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * The variant's quantity in each warehouse; `stock` is their sum.
     *
     * @return HasMany<WarehouseStock, $this>
     */
    public function warehouseStocks(): HasMany
    {
        return $this->hasMany(WarehouseStock::class);
    }

    /**
     * @return HasMany<StockMovement, $this>
     */
    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    /**
     * The store's variants for the inventory page, joined to their product (for name search
     * and sorting) and store (for the low-stock threshold).
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function inventoryOf(Builder $query, Store $store): void
    {
        $query->select('product_variants.*')
            ->join('products', 'products.id', '=', 'product_variants.product_id')
            ->join('stores', 'stores.id', '=', 'products.store_id')
            ->where('products.store_id', $store->id);
    }

    /**
     * "out" (nothing left), "low" (at or under the threshold) or "in". Needs inventoryOf().
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function stockLevel(Builder $query, ?string $level): void
    {
        $threshold = 'coalesce(product_variants.low_stock_threshold, stores.low_stock_threshold)';

        match ($level) {
            'out' => $query->where('product_variants.stock', 0),
            'low' => $query->where('product_variants.stock', '>', 0)->whereRaw("product_variants.stock <= {$threshold}"),
            'in' => $query->whereRaw("product_variants.stock > {$threshold}"),
            default => null,
        };
    }

    /**
     * "in", "low" or "out" for this variant's current stock.
     */
    public function stockLevelIn(Store $store): string
    {
        return match (true) {
            $this->stock === 0 => 'out',
            $this->stock <= $this->lowStockThreshold($store) => 'low',
            default => 'in',
        };
    }

    /**
     * Stock at or below this (but above zero) is low: the variant's own threshold, else the store's.
     */
    public function lowStockThreshold(Store $store): int
    {
        return $this->low_stock_threshold ?? $store->low_stock_threshold;
    }

    /**
     * Human-readable combination, e.g. "أحمر / L"; empty for a simple product.
     */
    public function title(): string
    {
        return implode(' / ', $this->option_values ?? []);
    }

    public function activityLabel(): string
    {
        return trim(($this->product?->name ?? '').' '.implode(' / ', $this->option_values ?? [])) ?: ($this->sku ?? '#'.$this->id);
    }
}
