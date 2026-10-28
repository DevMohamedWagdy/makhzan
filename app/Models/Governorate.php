<?php

namespace App\Models;

use App\Support\Locations;
use Database\Factories\GovernorateFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A governorate stores, orders and addresses are delivered to. Its id is a stable string (e.g. "cairo")
 * stored as `governorate_id` across the app; inactive ones stay readable on old records but can't be
 * picked for new addresses or shipping rates.
 */
#[Fillable(['id', 'name', 'name_en', 'sort_order', 'is_active'])]
class Governorate extends Model
{
    /** @use HasFactory<GovernorateFactory> */
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
     * @return HasMany<City, $this>
     */
    public function cities(): HasMany
    {
        return $this->hasMany(City::class)->orderBy('sort_order')->orderBy('name');
    }
}
