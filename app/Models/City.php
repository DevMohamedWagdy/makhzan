<?php

namespace App\Models;

use App\Support\Locations;
use Database\Factories\CityFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A city inside a governorate, stored as `city_id` on stores, orders and addresses. Like governorates,
 * an inactive city stays readable on old records but can't be picked for new ones.
 */
#[Fillable(['id', 'governorate_id', 'name', 'name_en', 'sort_order', 'is_active'])]
class City extends Model
{
    /** @use HasFactory<CityFactory> */
    use HasFactory;

    public $incrementing = false;

    protected $keyType = 'string';

    protected static function booted(): void
    {
        static::saved(fn () => Locations::forget());
        static::deleted(fn () => Locations::forget());
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<Governorate, $this>
     */
    public function governorate(): BelongsTo
    {
        return $this->belongsTo(Governorate::class);
    }
}
