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
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained()->nullOnDelete();
            // Sequential per store (#1001, #1002, ...), shown to customers and vendors.
            $table->unsignedInteger('number');
            $table->string('status', 20)->default('pending');
            $table->string('payment_method', 20)->default('cod');

            $table->decimal('subtotal', 12, 2);
            $table->decimal('shipping_fee', 10, 2)->default(0);
            $table->decimal('total', 12, 2);

            // Delivery address, copied from the customer's address when the order is placed.
            $table->string('recipient_name');
            $table->string('phone', 20);
            $table->string('governorate_id', 40);
            $table->string('city_id', 40);
            $table->string('address_line');
            $table->string('landmark', 150)->nullable();
            $table->string('customer_note', 500)->nullable();

            // Affiliate attribution and the commission agreed when the order was placed.
            $table->foreignId('affiliate_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('referral_code_id')->nullable()->constrained('affiliate_referral_codes')->nullOnDelete();
            $table->string('referral_code', 32)->nullable();
            $table->string('commission_type', 20)->nullable();
            $table->decimal('commission_rate', 10, 2)->nullable();
            $table->decimal('commission_amount', 12, 2)->default(0);
            $table->string('commission_status', 20)->default('none');

            $table->string('cancel_reason', 200)->nullable();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamp('shipped_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamp('returned_at')->nullable();
            $table->timestamps();

            $table->unique(['store_id', 'number']);
            $table->index(['store_id', 'status', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
