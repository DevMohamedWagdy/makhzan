<?php

namespace App\Models;

use App\Enums\ReviewStatus;
use Database\Factories\ProductReviewFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

/**
 * A shopper's rating of a product they received, with optional text and photos. It shows on
 * the product page once the vendor approves it; the vendor may reply publicly.
 */
#[Fillable(['customer_id', 'order_id', 'customer_name', 'rating', 'body', 'images', 'status', 'reply', 'replied_at'])]
class ProductReview extends Model
{
    /** @use HasFactory<ProductReviewFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'rating' => 'integer',
            'images' => 'array',
            'status' => ReviewStatus::class,
            'replied_at' => 'datetime',
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
     * @return BelongsTo<Product, $this>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class)->withTrashed();
    }

    /**
     * @return BelongsTo<Customer, $this>
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * @return BelongsTo<Order, $this>
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * Public URLs of the review's photos.
     *
     * @return Attribute<list<string>, never>
     */
    protected function imageUrls(): Attribute
    {
        return Attribute::get(fn (): array => array_map(fn (string $path): string => Storage::disk('public')->url($path), $this->images ?? []));
    }

    /**
     * The reviewer's first name only, so shoppers don't see each other's full names.
     */
    public function publicName(): string
    {
        return strtok(trim($this->customer_name), ' ') ?: $this->customer_name;
    }
}
