<?php

use App\Support\StorePermissions;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Roles saved with the coarser permissions (products also covering categories, marketing
     * covering coupons and payouts, settings covering shipping…) get the matching per-feature
     * ones, so no staff member loses access. Every existing role also keeps the dashboard and
     * the notification bell it always had.
     */
    public function up(): void
    {
        DB::table('store_roles')->orderBy('id')->each(function (object $role): void {
            $permissions = json_decode($role->permissions ?? '[]', true) ?: [];
            $upgraded = StorePermissions::upgrade([...$permissions, 'dashboard.view', 'notifications.view']);

            DB::table('store_roles')->where('id', $role->id)->update(['permissions' => json_encode($upgraded)]);
        });
    }

    /**
     * The per-feature permissions can't be folded back without losing choices made since.
     */
    public function down(): void
    {
        //
    }
};
