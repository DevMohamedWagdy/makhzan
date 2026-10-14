<?php

namespace App\Models;

use App\Models\Concerns\LogsActivity;
use Database\Factories\StoreRoleFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A named set of permissions ("orders.view", "products.update", …) the owner gives staff.
 */
#[Fillable(['name', 'description', 'permissions'])]
class StoreRole extends Model
{
    /** @use HasFactory<StoreRoleFactory> */
    use HasFactory, LogsActivity;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'permissions' => 'array',
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
     * @return HasMany<Vendor, $this>
     */
    public function staff(): HasMany
    {
        return $this->hasMany(Vendor::class, 'role_id');
    }

    public function allows(string $permission): bool
    {
        return in_array($permission, $this->permissions ?? [], true);
    }
}
