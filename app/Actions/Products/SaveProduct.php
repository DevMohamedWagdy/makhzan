<?php

namespace App\Actions\Products;

use App\Actions\Inventory\ChangeStock;
use App\Enums\StockMovementType;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\StockMovement;
use App\Models\Store;
use App\Models\Warehouse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SaveProduct
{
    public function __construct(private ChangeStock $changeStock) {}

    /**
     * Creates the product, or updates it, and syncs its variants: rows sent with an id are
     * updated, new rows are created and variants missing from the payload are deleted.
     * Quantities are applied through ChangeStock, so an opening stock or an edit made here
     * shows up in the stock movements log. A variant sent with warehouse_stocks gets each
     * warehouse's quantity set; otherwise its quantity is the total and the change goes into
     * the chosen warehouse, or the store's default one.
     *
     * @param  array{category_id: int, name: string, name_en?: string|null, description?: string|null, description_en?: string|null, status: string, is_featured?: bool, warehouse_id?: int|null, options: array<int, array{name: string, values: list<string>}>, variants: array<int, array{id?: int|null, option_values: list<string>, price: float|string, compare_at_price?: float|string|null, cost?: float|string|null, sku?: string|null, stock: int, warehouse_stocks?: list<array{warehouse_id: int, stock: int}>}>}  $data
     */
    public function handle(Store $store, array $data, ?Product $product = null): Product
    {
        return DB::transaction(function () use ($store, $data, $product): Product {
            $warehouse = isset($data['warehouse_id']) ? $store->warehouses()->findOrFail($data['warehouse_id']) : null;
            $product ??= $store->products()->make(['slug' => Product::uniqueSlug($store->id, $data['name'])]);

            $product->fill([
                'category_id' => $data['category_id'],
                'name' => $data['name'],
                'name_en' => $data['name_en'] ?? null,
                'description' => $data['description'] ?? null,
                'description_en' => $data['description_en'] ?? null,
                'status' => $data['status'],
                'is_featured' => $data['is_featured'] ?? false,
                'options' => array_values($data['options']),
            ])->save();

            $keptIds = collect($data['variants'])->pluck('id')->filter()->all();
            $product->variants()->whereKeyNot($keptIds)->delete();

            foreach (array_values($data['variants']) as $position => $variant) {
                $attributes = [
                    'option_values' => array_values($variant['option_values']),
                    'sku' => $variant['sku'] ?? null,
                    'price' => $variant['price'],
                    'compare_at_price' => $variant['compare_at_price'] ?? null,
                    'position' => $position,
                ];

                if (array_key_exists('cost', $variant)) {
                    $attributes['cost'] = $variant['cost'];
                }

                $isNew = ! isset($variant['id']);

                if ($isNew) {
                    $model = $product->variants()->create($attributes);
                } else {
                    $model = $product->variants()->findOrFail($variant['id']);
                    $model->update($attributes);
                }

                if (isset($variant['warehouse_stocks'])) {
                    $this->warehouseStocks($store, $model, $variant['warehouse_stocks'], $isNew ? StockMovementType::Initial : StockMovementType::ProductEdit);
                } elseif ($isNew) {
                    $this->changeStock->by($model, (int) $variant['stock'], StockMovementType::Initial, StockMovement::ACTOR_VENDOR, warehouse: $warehouse);
                } else {
                    $this->totalStock($model, (int) $variant['stock'], $position, $warehouse);
                }
            }

            return $product->load(['category', 'variants.warehouseStocks', 'images']);
        });
    }

    /**
     * Sets the variant's quantity in each listed warehouse, logging each difference as a stock movement.
     *
     * @param  list<array{warehouse_id: int, stock: int}>  $warehouseStocks
     */
    private function warehouseStocks(Store $store, ProductVariant $variant, array $warehouseStocks, StockMovementType $type): void
    {
        $warehouses = $store->warehouses()->get()->keyBy('id');

        foreach ($warehouseStocks as $warehouseStock) {
            $this->changeStock->to($variant, (int) $warehouseStock['stock'], $type, StockMovement::ACTOR_VENDOR, warehouse: $warehouses[$warehouseStock['warehouse_id']]);
        }
    }

    /**
     * The form's quantity is the variant's total; a change lands in the chosen warehouse, or the default one.
     *
     * @throws ValidationException
     */
    private function totalStock(ProductVariant $variant, int $total, int $position, ?Warehouse $warehouse): void
    {
        try {
            $this->changeStock->total($variant, $total, StockMovementType::ProductEdit, StockMovement::ACTOR_VENDOR, $warehouse);
        } catch (ValidationException $exception) {
            throw ValidationException::withMessages(["variants.{$position}.stock" => $exception->validator->errors()->first()]);
        }
    }
}
