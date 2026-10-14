<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->boolean('loyalty_enabled')->default(false);
            $table->unsignedSmallInteger('loyalty_earn_rate')->default(10);
            $table->decimal('loyalty_point_value', 8, 2)->default(0.25);
            $table->unsignedInteger('loyalty_min_redeem')->default(100);
        });

        Schema::table('customers', function (Blueprint $table) {
            $table->unsignedInteger('points_balance')->default(0);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->unsignedInteger('points_redeemed')->default(0);
            $table->decimal('points_discount', 12, 2)->default(0);
            $table->unsignedInteger('points_earned')->default(0);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['points_redeemed', 'points_discount', 'points_earned']);
        });

        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn('points_balance');
        });

        Schema::table('stores', function (Blueprint $table) {
            $table->dropColumn(['loyalty_enabled', 'loyalty_earn_rate', 'loyalty_point_value', 'loyalty_min_redeem']);
        });
    }
};
