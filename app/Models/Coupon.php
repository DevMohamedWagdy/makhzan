<?php

namespace App\Models;

use App\Enums\CouponType;
use App\Enums\OrderStatus;
use App\Models\Concerns\BelongsToStore;
use App\Models\Concerns\LogsActivity;
use Database\Factories\CouponFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A discount code shoppers enter at checkout. Checked and applied by
 * App\Actions\Coupons\ApplyCoupon; uses are counted from orders that weren't cancelled.
 */
#[Fillable([
    'code', 'description', 'type', 'value', 'max_discount', 'min_subtotal', 'applies_to', 'product_ids', 'category_ids',
    'usage_limit', 'per_customer_limit', 'first_order_only', 'affiliate_id', 'starts_at', 'ends_at', 'is_active',
])]
class Coupon extends Model
{
    /** @use HasFactory<CouponFactory> */
    use BelongsToStore, HasFactory, LogsActivity;

    /** @var list<string> Attributes not worth an activity log entry. */
    protected array $activityIgnored = ['uses_count', 'orders_count', 'discount_total'];

    public const APPLIES_TO_ALL = 'all';

    public const APPLIES_TO_PRODUCTS = 'products';

    public const APPLIES_TO_CATEGORIES = 'categories';

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => CouponType::class,
            'value' => 'float',
            'max_discount' => 'float',
            'min_subtotal' => 'float',
            'product_ids' => 'array',
            'category_ids' => 'array',
            'usage_limit' => 'integer',
            'per_customer_limit' => 'integer',
            'first_order_only' => 'boolean',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Codes are stored upper-case and without spaces.
     *
     * @return Attribute<string, string>
     */
    protected function code(): Attribute
    {
        return Attribute::set(fn (string $value): string => self::normalize($value));
    }

    public static function normalize(?string $code): string
    {
        return mb_strtoupper(preg_replace('/\s+/', '', (string) $code));
    }

    /**
     * @return BelongsTo<Store, $this>
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /**
     * @return BelongsTo<Affiliate, $this>
     */
    public function affiliate(): BelongsTo
    {
        return $this->belongsTo(Affiliate::class);
    }

    /**
     * @return HasMany<Order, $this>
     */
    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    /**
     * Orders that count as uses: everything except cancelled orders.
     *
     * @return HasMany<Order, $this>
     */
    public function uses(): HasMany
    {
        return $this->orders()->where('status', '!=', OrderStatus::Cancelled);
    }

    /**
     * "active", "scheduled" (starts later), "expired" (ended or used up) or "disabled".
     */
    public function state(?int $uses = null): string
    {
        return match (true) {
            ! $this->is_active => 'disabled',
            $this->ends_at?->isPast() => 'expired',
            $this->usage_limit !== null && ($uses ?? $this->uses()->count()) >= $this->usage_limit => 'expired',
            $this->starts_at?->isFuture() => 'scheduled',
            default => 'active',
        };
    }

    /**
     * Adds usage numbers from orders that weren't cancelled: uses_count, discount_total,
     * shipping_discount_total and sales_total.
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function withUsageStats(Builder $query): void
    {
        $notCancelled = fn ($query) => $query->where('status', '!=', OrderStatus::Cancelled);

        $query
            ->withCount(['orders as uses_count' => $notCancelled])
            ->withSum(['orders as discount_total' => $notCancelled], 'discount')
            ->withSum(['orders as shipping_discount_total' => $notCancelled], 'shipping_discount')
            ->withSum(['orders as sales_total' => $notCancelled], 'total');
    }

    /**
     * Filter by state (see state()). "expired" includes coupons whose usage limit is reached.
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function inState(Builder $query, ?string $state): void
    {
        $uses = '(select count(*) from orders where orders.coupon_id = coupons.id and orders.status != ?)';
        $usedUp = "(coupons.usage_limit is not null and {$uses} >= coupons.usage_limit)";
        $cancelled = OrderStatus::Cancelled->value;

        match ($state) {
            'disabled' => $query->where('is_active', false),
            'expired' => $query->where('is_active', true)->where(fn (Builder $query) => $query->where('ends_at', '<=', now())->orWhereRaw($usedUp, [$cancelled])),
            'scheduled' => $query->where('is_active', true)->where('starts_at', '>', now())->where(fn (Builder $query) => $query->whereNull('ends_at')->orWhere('ends_at', '>', now()))->whereRaw("not {$usedUp}", [$cancelled]),
            'active' => $query->where('is_active', true)
                ->where(fn (Builder $query) => $query->whereNull('starts_at')->orWhere('starts_at', '<=', now()))
                ->where(fn (Builder $query) => $query->whereNull('ends_at')->orWhere('ends_at', '>', now()))
                ->whereRaw("not {$usedUp}", [$cancelled]),
            default => null,
        };
    }

    /**
     * Does a cart line (product and its category) count toward the discount?
     */
    public function appliesTo(int $productId, ?int $categoryId): bool
    {
        return match ($this->applies_to) {
            self::APPLIES_TO_PRODUCTS => in_array($productId, $this->product_ids ?? [], true),
            self::APPLIES_TO_CATEGORIES => $categoryId !== null && in_array($categoryId, $this->category_ids ?? [], true),
            default => true,
        };
    }

    public function isFreeShipping(): bool
    {
        return $this->type === CouponType::FreeShipping;
    }
}
