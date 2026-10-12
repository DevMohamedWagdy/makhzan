<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Keyed by affiliate rather than email: affiliate emails are optional and may repeat
     * across stores, and the shared password_reset_tokens table is keyed by email alone.
     */
    public function up(): void
    {
        Schema::create('affiliate_password_reset_tokens', function (Blueprint $table) {
            $table->foreignId('affiliate_id')->primary()->constrained()->cascadeOnDelete();
            $table->string('token'); // Hashed.
            $table->timestamp('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('affiliate_password_reset_tokens');
    }
};
