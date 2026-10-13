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
        Schema::table('stores', function (Blueprint $table) {
            $table->string('description', 500)->nullable();

            // Contact details and social links shown in the storefront footer.
            $table->string('contact_phone', 20)->nullable();
            $table->string('whatsapp', 20)->nullable();
            $table->string('contact_email')->nullable();
            $table->string('address', 255)->nullable();
            $table->string('facebook_url', 255)->nullable();
            $table->string('instagram_url', 255)->nullable();
            $table->string('tiktok_url', 255)->nullable();

            // A bar across the top of the storefront, e.g. "Free shipping this week".
            $table->string('announcement', 200)->nullable();
            // Pausing orders keeps the store browsable but closes checkout with this message.
            $table->boolean('accepting_orders')->default(true);
            $table->string('closed_message', 200)->nullable();
            $table->decimal('min_order_total', 12, 2)->nullable();

            $table->text('return_policy')->nullable();
            $table->text('shipping_policy')->nullable();
            $table->text('privacy_policy')->nullable();
            $table->text('terms')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->dropColumn([
                'description', 'contact_phone', 'whatsapp', 'contact_email', 'address', 'facebook_url', 'instagram_url', 'tiktok_url',
                'announcement', 'accepting_orders', 'closed_message', 'min_order_total', 'return_policy', 'shipping_policy', 'privacy_policy', 'terms',
            ]);
        });
    }
};
