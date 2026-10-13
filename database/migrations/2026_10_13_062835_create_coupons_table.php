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
        Schema::create('coupons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            // Stored upper-case; shoppers can type it in any case.
            $table->string('code', 32);
            $table->string('description', 200)->nullable();
            $table->string('type', 20);
            // Percent or amount; unused for free shipping.
            $table->decimal('value', 12, 2)->nullable();
            // Cap on a percentage discount.
            $table->decimal('max_discount', 12, 2)->nullable();
            $table->decimal('min_subtotal', 12, 2)->nullable();
            // "all", "products" or "categories"; the ids it applies to otherwise.
            $table->string('applies_to', 20)->default('all');
            $table->json('product_ids')->nullable();
            $table->json('category_ids')->nullable();
            $table->unsignedInteger('usage_limit')->nullable();
            $table->unsignedInteger('per_customer_limit')->nullable();
            $table->boolean('first_order_only')->default(false);
            // Orders using an affiliate's coupon are credited to that affiliate.
            $table->foreignId('affiliate_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['store_id', 'code']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('coupons');
    }
};
