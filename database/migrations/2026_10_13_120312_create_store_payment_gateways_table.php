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
        Schema::create('store_payment_gateways', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            // The provider, e.g. paymob. Payments go straight to the vendor's own account.
            $table->string('gateway', 20);
            // API keys and integration ids, encrypted with the app key.
            $table->text('credentials');
            $table->boolean('is_live')->default(false);
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();

            $table->unique(['store_id', 'gateway']);
        });

        Schema::table('stores', function (Blueprint $table) {
            $table->boolean('cod_enabled')->default(true);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->dropColumn('cod_enabled');
        });

        Schema::dropIfExists('store_payment_gateways');
    }
};
