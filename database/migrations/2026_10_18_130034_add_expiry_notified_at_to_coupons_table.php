<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * When the owner was told the coupon expired, so each coupon is announced once.
     */
    public function up(): void
    {
        Schema::table('coupons', function (Blueprint $table) {
            $table->dateTime('expiry_notified_at')->nullable()->after('ends_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('coupons', function (Blueprint $table) {
            $table->dropColumn('expiry_notified_at');
        });
    }
};
