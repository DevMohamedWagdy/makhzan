<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Removes subscription plans (plans, trials, payments, requests) and the Bosta shipping
 * integration. Manual tracking numbers on orders (carrier, tracking_number) stay.
 */
return new class extends Migration
{
    /**
     * Notification types that no longer exist.
     *
     * @var list<string>
     */
    private const OLD_NOTIFICATIONS = [
        'subscription_activated', 'subscription_rejected', 'subscription_expiring', 'trial_ending',
        'subscription_requested', 'trial_ended', 'plan_limit_near', 'plan_limit_reached',
    ];

    public function up(): void
    {
        DB::table('notifications')->whereIn('type', self::OLD_NOTIFICATIONS)->delete();
        $this->removePermission('store_roles', 'orders.ship');
        $this->removePermission('admin_roles', 'subscriptions.view', 'subscriptions.manage', 'plans.view', 'plans.manage');

        Schema::dropIfExists('subscription_requests');
        Schema::dropIfExists('subscription_payments');

        Schema::table('stores', function (Blueprint $table) {
            $table->dropForeign(['plan_id']);
            $table->dropColumn(['plan_id', 'plan_expires_at', 'trial_ends_at']);
        });

        Schema::dropIfExists('plans');
        Schema::dropIfExists('store_shipping_accounts');

        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['carrier_shipment_id']);
            $table->dropColumn(['carrier_shipment_id', 'carrier_status', 'carrier_status_code']);
        });
    }

    /**
     * Brings back the tables and columns, empty: the removed data is not restored.
     */
    public function down(): void
    {
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug', 40)->unique();
            $table->string('description', 255)->nullable();
            $table->decimal('price_monthly', 10, 2)->default(0);
            $table->decimal('price_yearly', 10, 2)->nullable();
            $table->unsignedInteger('max_products')->nullable();
            $table->unsignedInteger('max_staff')->nullable();
            $table->json('features')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('position')->default(0);
            $table->timestamps();
        });

        Schema::table('stores', function (Blueprint $table) {
            $table->foreignId('plan_id')->nullable()->after('vendor_id')->constrained()->nullOnDelete();
            $table->timestamp('plan_expires_at')->nullable()->after('plan_id');
            $table->timestamp('trial_ends_at')->nullable()->after('plan_expires_at');
        });

        Schema::create('subscription_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('plan_id')->nullable()->constrained()->nullOnDelete();
            $table->string('plan_name');
            $table->decimal('amount', 10, 2);
            $table->unsignedSmallInteger('months');
            $table->string('method', 30);
            $table->string('reference', 100)->nullable();
            $table->string('notes', 500)->nullable();
            $table->dateTime('starts_at');
            $table->dateTime('ends_at');
            $table->foreignId('recorded_by')->nullable()->constrained('admins')->nullOnDelete();
            $table->timestamps();

            $table->index(['store_id', 'created_at']);
        });

        Schema::create('subscription_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('plan_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('months');
            $table->decimal('amount', 10, 2);
            $table->string('method', 30);
            $table->string('reference', 100)->nullable();
            $table->string('notes', 500)->nullable();
            $table->string('status', 20)->default('pending');
            $table->string('review_note', 255)->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('admins')->nullOnDelete();
            $table->foreignId('subscription_payment_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();

            $table->index(['status', 'created_at']);
        });

        Schema::create('store_shipping_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->string('carrier', 30);
            $table->text('credentials');
            $table->json('settings')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();

            $table->unique(['store_id', 'carrier']);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->string('carrier_shipment_id', 60)->nullable()->index();
            $table->string('carrier_status', 120)->nullable();
            $table->unsignedSmallInteger('carrier_status_code')->nullable();
        });
    }

    /**
     * Takes permission keys out of every role's JSON list.
     */
    private function removePermission(string $table, string ...$permissions): void
    {
        DB::table($table)->select(['id', 'permissions'])->orderBy('id')->each(function (object $role) use ($table, $permissions): void {
            $current = json_decode((string) $role->permissions, true) ?? [];
            $kept = array_values(array_diff($current, $permissions));

            if ($kept !== $current) {
                DB::table($table)->where('id', $role->id)->update(['permissions' => json_encode($kept)]);
            }
        });
    }
};
