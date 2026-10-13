<?php

namespace App\Models;

use App\Enums\CommissionStatus;
use App\Enums\CommissionType;
use App\Enums\OrderStatus;
use App\Enums\StockMovementType;
use Database\Factories\OrderFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A cash-on-delivery order. Address, prices and the affiliate commission are snapshots
 * taken when it was placed; status changes go through App\Actions\Orders\UpdateOrderStatus.
 */
#[Fillable([
    'customer_id', 'number', 'status', 'payment_method', 'subtotal', 'discount', 'shipping_fee', 'shipping_discount', 'total', 'coupon_id', 'coupon_code',
    'recipient_name', 'phone', 'governorate_id', 'city_id', 'address_line', 'landmark', 'customer_note',
    'affiliate_id', 'referral_code_id', 'referral_code', 'commission_type', 'commission_rate', 'commission_amount', 'commission_status',
])]
class Order extends Model
{
    /** @use HasFactory<OrderFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'number' => 'integer',
            'status' => OrderStatus::class,
            'subtotal' => 'float',
            'discount' => 'float',
            'shipping_fee' => 'float',
            'shipping_discount' => 'float',
            'total' => 'float',
            'commission_type' => CommissionType::class,
            'commission_rate' => 'float',
            'commission_amount' => 'float',
            'commission_status' => CommissionStatus::class,
            'confirmed_at' => 'datetime',
            'shipped_at' => 'datetime',
            'delivered_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'returned_at' => 'datetime',
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
     * @return BelongsTo<Customer, $this>
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * @return BelongsTo<Affiliate, $this>
     */
    public function affiliate(): BelongsTo
    {
        return $this->belongsTo(Affiliate::class);
    }

    /**
     * @return BelongsTo<Coupon, $this>
     */
    public function coupon(): BelongsTo
    {
        return $this->belongsTo(Coupon::class);
    }

    /**
     * @return BelongsTo<AffiliateReferralCode, $this>
     */
    public function referralCode(): BelongsTo
    {
        return $this->belongsTo(AffiliateReferralCode::class);
    }

    /**
     * @return HasMany<OrderItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    /**
     * Stock taken off the shelf for this order, one row per warehouse and variant.
     *
     * @return HasMany<StockMovement, $this>
     */
    public function saleMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class)->where('type', StockMovementType::Sale);
    }

    /**
     * @return HasMany<OrderEvent, $this>
     */
    public function events(): HasMany
    {
        return $this->hasMany(OrderEvent::class)->oldest('id');
    }

    /**
     * Search by order number, customer name or phone.
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function search(Builder $query, ?string $term): void
    {
        $term = trim((string) $term, " \t#");

        if ($term === '') {
            return;
        }

        $query->where(function (Builder $query) use ($term): void {
            $query->where('recipient_name', 'like', "%{$term}%")
                ->orWhere('phone', 'like', "%{$term}%")
                ->when(ctype_digit($term), fn (Builder $query) => $query->orWhere('number', (int) $term));
        });
    }
}
