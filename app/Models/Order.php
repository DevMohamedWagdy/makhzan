<?php

namespace App\Models;

use App\Enums\CommissionStatus;
use App\Enums\CommissionType;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\StockMovementType;
use App\Models\Concerns\LogsActivity;
use App\Support\Shipping\BostaClient;
use Database\Factories\OrderFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * An order, paid on delivery or online. Address, prices and the affiliate commission are
 * snapshots taken when it was placed; status changes go through App\Actions\Orders\UpdateOrderStatus.
 * Online orders wait for their payment (payment_status) before the store can confirm them.
 */
#[Fillable([
    'customer_id', 'number', 'status', 'payment_method', 'payment_status', 'payment_expires_at', 'subtotal', 'discount', 'shipping_fee', 'shipping_discount', 'total', 'coupon_id', 'coupon_code',
    'points_redeemed', 'points_discount',
    'recipient_name', 'phone', 'governorate_id', 'city_id', 'address_line', 'landmark', 'customer_note',
    'affiliate_id', 'referral_code_id', 'referral_code', 'commission_type', 'commission_rate', 'commission_amount', 'commission_status',
])]
class Order extends Model
{
    /** @use HasFactory<OrderFactory> */
    use HasFactory, LogsActivity;

    /** @var list<string> Attributes not worth an activity log entry. */
    protected array $activityIgnored = ['payment_expires_at'];

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
            'payment_method' => PaymentMethod::class,
            'payment_status' => PaymentStatus::class,
            'paid_at' => 'datetime',
            'payment_expires_at' => 'datetime',
            'refunded_amount' => 'float',
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
            'carrier_status_code' => 'integer',
            'carrier_updated_at' => 'datetime',
            'tracking' => 'array',
            'points_redeemed' => 'integer',
            'points_discount' => 'float',
            'points_earned' => 'integer',
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
     * @return HasMany<Payment, $this>
     */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    /**
     * The most recent attempt to pay online.
     *
     * @return HasOne<Payment, $this>
     */
    public function latestPayment(): HasOne
    {
        return $this->hasOne(Payment::class)->latestOfMany();
    }

    /**
     * @return HasMany<PaymentRefund, $this>
     */
    public function refunds(): HasMany
    {
        return $this->hasMany(PaymentRefund::class)->oldest('id');
    }

    /**
     * An online order whose payment hasn't come through yet: the store can't confirm it, and
     * it's cancelled once payment_expires_at passes.
     */
    public function awaitingPayment(): bool
    {
        return $this->payment_method?->isOnline() && ! $this->payment_status?->isPaid();
    }

    /**
     * The customer may (re)open the payment page: still pending, unpaid and not expired.
     */
    public function canPay(): bool
    {
        return $this->status === OrderStatus::Pending && $this->awaitingPayment() && $this->payment_expires_at?->isFuture();
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

    /**
     * Who carries the order and how to track it, or null before it has a tracking number.
     *
     * @return array{carrier: string, tracking_number: string, tracking_url: string|null, status: string|null, updated_at: string|null, is_bosta: bool}|null
     */
    public function shipment(): ?array
    {
        if (! $this->tracking_number) {
            return null;
        }

        $isBosta = $this->carrier === StoreShippingAccount::BOSTA;

        return [
            'carrier' => $isBosta ? __('orders.carriers.bosta') : (string) $this->carrier,
            'tracking_number' => $this->tracking_number,
            'tracking_url' => $isBosta ? BostaClient::trackingUrl($this->tracking_number) : null,
            'status' => $this->carrier_status,
            'updated_at' => $this->carrier_updated_at?->toIso8601String(),
            'is_bosta' => $isBosta,
        ];
    }

    public function activityLabel(): string
    {
        return '#'.$this->number;
    }

    /**
     * @param  array<string, mixed>  $changed
     */
    public function activityEvent(string $default, array $changed): string
    {
        return array_key_exists('status', $changed) ? 'status_changed' : (array_key_exists('tracking_number', $changed) ? 'shipped' : $default);
    }
}
