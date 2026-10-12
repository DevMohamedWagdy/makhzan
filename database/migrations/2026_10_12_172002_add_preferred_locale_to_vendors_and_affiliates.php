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
        foreach (['vendors', 'affiliates'] as $table) {
            Schema::table($table, function (Blueprint $table) {
                // Language for emails and other messages sent outside a request (see HasPreferredLocale).
                $table->string('preferred_locale', 5)->nullable();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        foreach (['vendors', 'affiliates'] as $table) {
            Schema::table($table, function (Blueprint $table) {
                $table->dropColumn('preferred_locale');
            });
        }
    }
};
