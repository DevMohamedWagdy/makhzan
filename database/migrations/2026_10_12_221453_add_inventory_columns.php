<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Purchase cost and low-stock thresholds for inventory, and the cost of each sold item
     * (snapshotted like its price) for profit reports.
     */
    public function up(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->unsignedInteger('low_stock_threshold')->default(5);
        });

        Schema::table('product_variants', function (Blueprint $table) {
            $table->decimal('cost', 12, 2)->nullable()->after('compare_at_price');
            // Overrides the store's threshold for this variant.
            $table->unsignedInteger('low_stock_threshold')->nullable()->after('stock');
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->decimal('unit_cost', 12, 2)->nullable()->after('unit_price');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn('unit_cost');
        });

        Schema::table('product_variants', function (Blueprint $table) {
            $table->dropColumn(['cost', 'low_stock_threshold']);
        });

        Schema::table('stores', function (Blueprint $table) {
            $table->dropColumn('low_stock_threshold');
        });
    }
};
