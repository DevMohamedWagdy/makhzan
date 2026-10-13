<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('stock_movements', function (Blueprint $table) {
            $table->foreignId('warehouse_id')->nullable()->after('product_variant_id')->constrained()->nullOnDelete();
            $table->string('warehouse_name', 100)->nullable()->after('warehouse_id');
            // The warehouse's own stock around the movement (stock_before/after are the variant's total).
            $table->unsignedInteger('warehouse_stock_before')->nullable()->after('stock_after');
            $table->unsignedInteger('warehouse_stock_after')->nullable()->after('warehouse_stock_before');
            $table->foreignId('stock_transfer_id')->nullable()->after('purchase_order_id')->constrained()->nullOnDelete();
        });

        Schema::table('purchase_orders', function (Blueprint $table) {
            // Where received goods are stocked; the default warehouse when missing.
            $table->foreignId('warehouse_id')->nullable()->after('supplier_id')->constrained()->nullOnDelete();
        });

        // Every store gets a main warehouse holding the stock it already has.
        $now = now();

        DB::table('stores')->orderBy('id')->each(function (object $store) use ($now): void {
            $warehouseId = DB::table('warehouses')->insertGetId([
                'store_id' => $store->id,
                'name' => 'المخزن الرئيسي',
                'priority' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            DB::table('product_variants')
                ->join('products', 'products.id', '=', 'product_variants.product_id')
                ->where('products.store_id', $store->id)
                ->select('product_variants.id', 'product_variants.stock')
                ->orderBy('product_variants.id')
                ->chunk(500, function ($variants) use ($warehouseId, $now): void {
                    DB::table('warehouse_stocks')->insert($variants->map(fn (object $variant): array => [
                        'warehouse_id' => $warehouseId,
                        'product_variant_id' => $variant->id,
                        'stock' => $variant->stock,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ])->all());
                });

            DB::table('stock_movements')->where('store_id', $store->id)->update(['warehouse_id' => $warehouseId, 'warehouse_name' => 'المخزن الرئيسي']);
            DB::table('purchase_orders')->where('store_id', $store->id)->update(['warehouse_id' => $warehouseId]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('warehouse_id');
        });

        Schema::table('stock_movements', function (Blueprint $table) {
            $table->dropConstrainedForeignId('stock_transfer_id');
            $table->dropConstrainedForeignId('warehouse_id');
            $table->dropColumn(['warehouse_name', 'warehouse_stock_before', 'warehouse_stock_after']);
        });
    }
};
