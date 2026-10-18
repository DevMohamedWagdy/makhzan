<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Optional English names (and descriptions) shown when the dashboard or storefront is in
     * English; the main name stays the fallback.
     */
    public function up(): void
    {
        Schema::table('product_categories', function (Blueprint $table) {
            $table->string('name_en', 80)->nullable()->after('name');
            $table->string('description_en', 300)->nullable()->after('description');
        });

        Schema::table('product_collections', function (Blueprint $table) {
            $table->string('name_en', 80)->nullable()->after('name');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->string('name_en', 150)->nullable()->after('name');
            $table->text('description_en')->nullable()->after('description');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('product_categories', function (Blueprint $table) {
            $table->dropColumn(['name_en', 'description_en']);
        });

        Schema::table('product_collections', function (Blueprint $table) {
            $table->dropColumn('name_en');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['name_en', 'description_en']);
        });
    }
};
