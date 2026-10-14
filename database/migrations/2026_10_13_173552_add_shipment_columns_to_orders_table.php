<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Who carries the order and how to track it: a connected carrier (Bosta) fills every
     * column; for other companies the vendor types the name and tracking number.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('carrier', 60)->nullable();
            $table->string('tracking_number', 60)->nullable();
            $table->string('carrier_shipment_id', 60)->nullable()->index();
            $table->string('carrier_status', 120)->nullable();
            $table->unsignedSmallInteger('carrier_status_code')->nullable();
            $table->timestamp('carrier_updated_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['carrier_shipment_id']);
            $table->dropColumn(['carrier', 'tracking_number', 'carrier_shipment_id', 'carrier_status', 'carrier_status_code', 'carrier_updated_at']);
        });
    }
};
