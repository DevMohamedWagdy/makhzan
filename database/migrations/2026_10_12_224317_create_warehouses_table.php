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
        Schema::create('warehouses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->string('name', 100);
            $table->string('address', 255)->nullable();
            $table->string('governorate_id', 40)->nullable();
            // Orders take stock from the lowest number first; the first warehouse is the default.
            $table->unsignedInteger('priority')->default(0);
            $table->timestamps();

            $table->unique(['store_id', 'name']);
            $table->index(['store_id', 'priority']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('warehouses');
    }
};
