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
            // Null for cash on delivery; see App\Enums\PaymentStatus for online payments.
            $table->string('payment_status', 20)->nullable()->after('payment_method');
            $table->timestamp('paid_at')->nullable()->after('payment_status');
            // Unpaid online orders are cancelled after this, putting their stock back.
            $table->timestamp('payment_expires_at')->nullable()->after('paid_at');
            $table->decimal('refunded_amount', 12, 2)->default(0)->after('total');

            $table->index(['payment_status', 'payment_expires_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['payment_status', 'payment_expires_at']);
            $table->dropColumn(['payment_status', 'paid_at', 'payment_expires_at', 'refunded_amount']);
        });
    }
};
