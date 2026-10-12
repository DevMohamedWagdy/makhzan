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
        Schema::create('affiliate_payouts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('affiliate_id')->constrained()->cascadeOnDelete();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 14, 2);
            $table->string('status', 20);

            // Snapshot of where the money went; the affiliate's payout method may change later.
            $table->string('payout_type', 30);
            $table->string('payout_account_name');
            $table->string('payout_account_last4', 4);

            $table->string('reference', 100)->nullable();
            $table->string('request_note', 200)->nullable(); // From the affiliate.
            $table->string('note', 200)->nullable(); // From the vendor; shown to the affiliate.
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->timestamps();

            $table->index(['affiliate_id', 'created_at']);
            $table->index(['store_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('affiliate_payouts');
    }
};
