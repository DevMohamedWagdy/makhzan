<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Staff members are vendor accounts that work in someone else's store: store_id points at
     * that store (owners keep it null and own their store through stores.vendor_id).
     */
    public function up(): void
    {
        Schema::table('vendors', function (Blueprint $table) {
            $table->foreignId('store_id')->nullable()->after('id')->constrained()->cascadeOnDelete();
            $table->json('permissions')->nullable()->after('password');
            $table->boolean('is_active')->default(true)->after('permissions');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('vendors', function (Blueprint $table) {
            $table->dropConstrainedForeignId('store_id');
            $table->dropColumn(['permissions', 'is_active']);
        });
    }
};
