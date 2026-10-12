<?php

namespace App\Models;

use Database\Factories\ProductVariantFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A purchasable combination of a product's options (e.g. أحمر / L) with its own price,
 * SKU and stock.
 */
#[Fillable(['option_values', 'sku', 'price', 'compare_at_price', 'stock', 'position'])]
class ProductVariant extends Model
{
    /** @use HasFactory<ProductVariantFactory> */
    use HasFactory;

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
            'stock' => 'integer',
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
     * Human-readable combination, e.g. "أحمر / L"; empty for a simple product.
     */
    public function title(): string
    {
        return implode(' / ', $this->option_values ?? []);
    }
}
