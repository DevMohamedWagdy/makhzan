<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The vendor's own domain for the storefront, served once its DNS points at us.
     */
    public function up(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->string('custom_domain', 253)->nullable()->unique();
            $table->timestamp('custom_domain_verified_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->dropUnique(['custom_domain']);
            $table->dropColumn(['custom_domain', 'custom_domain_verified_at']);
        });
    }
};
