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
        Schema::create('affiliates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vendor_id')->constrained()->cascadeOnDelete();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->string('full_name');
            $table->string('phone', 20);
            $table->string('email')->nullable();
            // Nullable: bulk-imported affiliates set their own password before first login.
            $table->string('password')->nullable();
            $table->string('avatar_path')->nullable();
            $table->string('status', 20)->default('active');
            $table->string('tier', 20)->default('new');

            $table->string('payout_type', 30);
            $table->string('payout_account_name');
            $table->text('payout_account_number'); // Encrypted.
            $table->string('payout_bank_name')->nullable();
            $table->text('payout_iban')->nullable(); // Encrypted.

            $table->string('commission_type', 20)->nullable();
            $table->decimal('commission_value', 10, 2)->nullable();
            $table->string('commission_note', 200)->nullable();

            // Denormalized performance counters, maintained by the orders module.
            $table->unsignedInteger('orders_count')->default(0);
            $table->decimal('sales_total', 14, 2)->default(0);
            $table->decimal('earned_commission', 14, 2)->default(0);
            $table->decimal('pending_balance', 14, 2)->default(0);

            $table->string('source', 30)->default('manual');
            $table->string('frozen_reason', 200)->nullable();
            $table->timestamp('frozen_at')->nullable();
            $table->timestamp('last_active_at')->nullable();
            $table->rememberToken();
            $table->timestamps();

            $table->unique(['store_id', 'phone']);
            $table->index(['store_id', 'status', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('affiliates');
    }
};
