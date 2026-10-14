<?php

namespace App\Models;

use App\Enums\PlanFeature;
use App\Models\Concerns\LogsActivity;
use Database\Factories\PlanFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\AsEnumCollection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A subscription plan: a price, limits (null = unlimited) and included features.
 */
#[Fillable(['name', 'slug', 'description', 'price_monthly', 'price_yearly', 'max_products', 'max_staff', 'features', 'is_active', 'position'])]
class Plan extends Model
{
    /** @use HasFactory<PlanFactory> */
    use HasFactory, LogsActivity;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, mixed>
     */
    protected function casts(): array
    {
        return [
            'price_monthly' => 'float',
            'price_yearly' => 'float',
            'max_products' => 'integer',
            'max_staff' => 'integer',
            'features' => AsEnumCollection::of(PlanFeature::class),
            'is_active' => 'boolean',
            'position' => 'integer',
        ];
    }

    /**
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function ordered(Builder $query): void
    {
        $query->orderBy('position')->orderBy('price_monthly');
    }

    /**
     * @return HasMany<Store, $this>
     */
    public function stores(): HasMany
    {
        return $this->hasMany(Store::class);
    }

    public function includes(PlanFeature $feature): bool
    {
        return (bool) $this->features?->contains($feature);
    }

    /**
     * Price for a subscription period: the yearly price for 12 months when set.
     */
    public function priceFor(int $months): float
    {
        return $months === 12 && $this->price_yearly !== null ? $this->price_yearly : round($this->price_monthly * $months, 2);
    }
}
