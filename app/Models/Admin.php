<?php

namespace App\Models;

use App\Models\Concerns\LogsActivity;
use App\Notifications\AdminAlertNotification;
use App\Support\AdminPermissions;
use Database\Factories\AdminFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/**
 * A member of the platform team, managing stores, plans and subscriptions. Created with
 * `php artisan makhzan:create-admin`; there is no public sign-up.
 */
#[Fillable(['full_name', 'email', 'password', 'role_id', 'is_super', 'is_active'])]
#[Hidden(['password', 'remember_token'])]
class Admin extends Authenticatable
{
    /** Ability granted to admin panel tokens. */
    public const TOKEN_ABILITY = 'admin';

    /** @use HasFactory<AdminFactory> */
    use HasApiTokens, HasFactory, LogsActivity, Notifiable;

    /** @var list<string> Attributes not worth an activity log entry. */
    protected array $activityIgnored = ['last_login_at'];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'is_super' => 'boolean',
            'is_active' => 'boolean',
            'last_login_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<AdminRole, $this>
     */
    public function role(): BelongsTo
    {
        return $this->belongsTo(AdminRole::class, 'role_id');
    }

    /**
     * Super admins hold every permission; others those of their role.
     */
    public function hasPermission(string $permission): bool
    {
        return $this->is_super || (bool) $this->role?->allows($permission);
    }

    /**
     * @return list<string>
     */
    public function grantedPermissions(): array
    {
        return $this->is_super ? AdminPermissions::all() : array_values(array_intersect(AdminPermissions::all(), $this->role?->permissions ?? []));
    }

    /**
     * Sends an alert to every active admin allowed to act on it.
     */
    public static function notifyTeam(AdminAlertNotification $alert): void
    {
        $permission = AdminAlertNotification::PERMISSIONS[$alert->event] ?? 'overview.view';

        static::query()
            ->with('role')
            ->where('is_active', true)
            ->get()
            ->filter(fn (Admin $admin): bool => $admin->hasPermission($permission))
            ->each(fn (Admin $admin) => $admin->notify($alert));
    }

    /**
     * Issues an admin panel token, valid for 12 hours.
     */
    public function issueToken(): string
    {
        return $this->createToken('admin-panel', [self::TOKEN_ABILITY], now()->addHours(12))->plainTextToken;
    }
}
