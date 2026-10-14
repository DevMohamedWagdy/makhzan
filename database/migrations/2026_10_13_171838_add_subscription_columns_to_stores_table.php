<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The store's paid plan until plan_expires_at, and a platform suspension.
     */
    public function up(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->foreignId('plan_id')->nullable()->after('vendor_id')->constrained()->nullOnDelete();
            $table->timestamp('plan_expires_at')->nullable()->after('plan_id');
            $table->timestamp('suspended_at')->nullable();
            $table->string('suspension_reason', 255)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->dropConstrainedForeignId('plan_id');
            $table->dropColumn(['plan_expires_at', 'suspended_at', 'suspension_reason']);
        });
    }
};
