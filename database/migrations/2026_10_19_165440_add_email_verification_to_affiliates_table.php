<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Affiliates now sign in with their email (unique within a store) and confirm it with a
     * code. Accounts that already exist keep signing in without one.
     */
    public function up(): void
    {
        Schema::table('affiliates', function (Blueprint $table) {
            $table->timestamp('email_verified_at')->nullable()->after('email');
            $table->unique(['store_id', 'email']);
        });

        DB::table('affiliates')->update(['email_verified_at' => now()]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('affiliates', function (Blueprint $table) {
            $table->dropUnique(['store_id', 'email']);
            $table->dropColumn('email_verified_at');
        });
    }
};
