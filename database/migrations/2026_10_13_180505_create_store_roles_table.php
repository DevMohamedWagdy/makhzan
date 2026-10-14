<?php

use App\Support\StorePermissions;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Staff get their permissions from a role the owner defines ("section.action" keys).
     * Existing staff move onto a role holding every action of their old sections.
     */
    public function up(): void
    {
        Schema::create('store_roles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->string('name', 60);
            $table->string('description', 255)->nullable();
            $table->json('permissions');
            $table->timestamps();

            $table->unique(['store_id', 'name']);
        });

        Schema::table('vendors', function (Blueprint $table) {
            $table->foreignId('role_id')->nullable()->after('store_id')->constrained('store_roles')->nullOnDelete();
        });

        DB::table('vendors')->whereNotNull('store_id')->orderBy('id')->each(function (object $staff): void {
            $roleId = DB::table('store_roles')->insertGetId([
                'store_id' => $staff->store_id,
                'name' => mb_substr('صلاحيات '.$staff->full_name, 0, 60),
                'permissions' => json_encode(StorePermissions::forSections(json_decode($staff->permissions ?? '[]', true) ?: [])),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('vendors')->where('id', $staff->id)->update(['role_id' => $roleId]);
        });

        Schema::table('vendors', function (Blueprint $table) {
            $table->dropColumn('permissions');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('vendors', function (Blueprint $table) {
            $table->json('permissions')->nullable()->after('password');
            $table->dropConstrainedForeignId('role_id');
        });

        Schema::dropIfExists('store_roles');
    }
};
