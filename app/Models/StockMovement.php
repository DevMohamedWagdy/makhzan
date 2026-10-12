<?php

namespace App\Models;

use App\Enums\StockMovementType;
use Database\Factories\StockMovementFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One change to a variant's stock and why it happened. Written only through
 * App\Actions\Inventory\ChangeStock, so the stock column always equals the last stock_after.
 */
#[Fillable([
    'store_id', 'product_id', 'product_variant_id', 'product_name', 'variant_title', 'type',
    'quantity', 'stock_before', 'stock_after', 'unit_cost', 'order_id', 'actor', 'note',
])]
class StockMovement extends Model
{
    /** @use HasFactory<StockMovementFactory> */
    use HasFactory;

    public const ACTOR_VENDOR = 'vendor';

    public const ACTOR_CUSTOMER = 'customer';

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => StockMovementType::class,
            'quantity' => 'integer',
            'stock_before' => 'integer',
            'stock_after' => 'integer',
            'unit_cost' => 'float',
        ];
    }

    /**
     * @return BelongsTo<ProductVariant, $this>
     */
    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    /**
     * @return BelongsTo<Product, $this>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * @return BelongsTo<Order, $this>
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
