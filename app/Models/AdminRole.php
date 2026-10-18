<?php

namespace App\Models;

use App\Models\Concerns\LogsActivity;
use Database\Factories\AdminRoleFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A named set of admin panel permissions ("stores.view", "tickets.reply", …).
 */
#[Fillable(['name', 'description', 'permissions'])]
class AdminRole extends Model
{
    /** @use HasFactory<AdminRoleFactory> */
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
     * @return HasMany<Admin, $this>
     */
    public function admins(): HasMany
    {
        return $this->hasMany(Admin::class, 'role_id');
    }

    public function allows(string $permission): bool
    {
        return in_array($permission, $this->permissions ?? [], true);
    }
}
