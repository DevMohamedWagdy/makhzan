<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Platform team roles. Admins created before roles existed become super admins.
     * Also tracks the last sign-in of admins and vendors.
     */
    public function up(): void
    {
        Schema::create('admin_roles', function (Blueprint $table) {
            $table->id();
            $table->string('name', 60)->unique();
            $table->string('description', 255)->nullable();
            $table->json('permissions');
            $table->timestamps();
        });

        Schema::table('admins', function (Blueprint $table) {
            $table->foreignId('role_id')->nullable()->after('id')->constrained('admin_roles')->nullOnDelete();
            $table->boolean('is_super')->default(false)->after('password');
            $table->boolean('is_active')->default(true)->after('is_super');
            $table->timestamp('last_login_at')->nullable();
        });

        DB::table('admins')->update(['is_super' => true]);

        Schema::table('vendors', function (Blueprint $table) {
            $table->timestamp('last_login_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('vendors', function (Blueprint $table) {
            $table->dropColumn('last_login_at');
        });

        Schema::table('admins', function (Blueprint $table) {
            $table->dropConstrainedForeignId('role_id');
            $table->dropColumn(['is_super', 'is_active', 'last_login_at']);
        });

        Schema::dropIfExists('admin_roles');
    }
};
