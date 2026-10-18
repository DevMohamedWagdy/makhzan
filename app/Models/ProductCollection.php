<?php

namespace App\Models;

use App\Models\Concerns\BelongsToStore;
use App\Models\Concerns\HasEnglishTranslation;
use App\Models\Concerns\LogsActivity;
use Database\Factories\ProductCollectionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * A hand-picked group of products (e.g. أحدث العروض) shown as its own section on the store home page.
 */
#[Fillable(['name', 'name_en', 'position', 'is_active'])]
class ProductCollection extends Model
{
    /** @use HasFactory<ProductCollectionFactory> */
    use BelongsToStore, HasEnglishTranslation, HasFactory, LogsActivity;

    /** @var list<string> Attributes not worth an activity log entry. */
    protected array $activityIgnored = ['position'];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'position' => 'integer',
            'is_active' => 'boolean',
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
     * The collection's products in the merchant's chosen order.
     *
     * @return BelongsToMany<Product, $this>
     */
    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'collection_products', 'collection_id')
            ->withPivot('position')
            ->orderByPivot('position')
            ->orderBy('products.id');
    }
}
