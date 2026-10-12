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
            // Used for governorates without their own rate; null means only listed governorates are served.
            $table->decimal('default_shipping_price', 10, 2)->nullable();
            // Orders whose subtotal reaches this ship for free; null disables free shipping.
            $table->decimal('free_shipping_threshold', 12, 2)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->dropColumn(['default_shipping_price', 'free_shipping_threshold']);
        });
    }
};
