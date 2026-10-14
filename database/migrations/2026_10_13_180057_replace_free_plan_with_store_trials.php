<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * No free plan: new stores get a full-featured trial, then must subscribe. Stores that
     * exist now without a subscription start a fresh trial so nobody is locked out at once.
     */
    public function up(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->timestamp('trial_ends_at')->nullable()->after('plan_expires_at');
        });

        DB::table('stores')
            ->where(fn ($query) => $query->whereNull('plan_expires_at')->orWhere('plan_expires_at', '<=', now()))
            ->update(['trial_ends_at' => now()->addDays(14)]);

        // The free plan isn't offered any more; keep it only if stores still reference it.
        DB::table('plans')->where('is_default', true)->whereNotExists(fn ($query) => $query->from('stores')->whereColumn('stores.plan_id', 'plans.id'))->delete();
        DB::table('plans')->where('is_default', true)->update(['is_active' => false]);

        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn('is_default');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->boolean('is_default')->default(false)->after('features');
        });

        Schema::table('stores', function (Blueprint $table) {
            $table->dropColumn('trial_ends_at');
        });
    }
};
