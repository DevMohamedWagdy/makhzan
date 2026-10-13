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
        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('coupon_id')->nullable()->after('referral_code')->constrained()->nullOnDelete();
            $table->string('coupon_code', 32)->nullable()->after('coupon_id');
            // Off the products; the total is subtotal - discount + shipping_fee - shipping_discount.
            $table->decimal('discount', 12, 2)->default(0)->after('subtotal');
            $table->decimal('shipping_discount', 10, 2)->default(0)->after('shipping_fee');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('coupon_id');
            $table->dropColumn(['coupon_code', 'discount', 'shipping_discount']);
        });
    }
};
