<?php

namespace App\Actions\Inventory;

use App\Enums\StockMovementType;
use App\Models\ProductVariant;
use App\Models\StockMovement;
use App\Models\Store;
use App\Models\Warehouse;
use Illuminate\Support\Collection;

class ImportInventory
{
    public function __construct(private ChangeStock $changeStock) {}

    /**
     * Applies an edited copy of the inventory export. Rows are matched by variant_id, or by
     * SKU when it identifies a single variant. A `stock` cell is the counted quantity (logged
     * as a stock count) and a `cost` cell the unit cost; empty cells leave the value alone.
     * Bad rows are skipped and reported with their line numbers.
     *
     * @param  list<array<string, mixed>>  $rows
     * @param  Warehouse|null  $warehouse  where counted quantities apply; the default warehouse when null
     * @return array{updated: int, unchanged: int, skipped: int, errors: list<array{row: int, message: string}>}
     */
    public function handle(Store $store, array $rows, ?Warehouse $warehouse = null): array
    {
        $warehouse ??= $store->defaultWarehouse();
        $variants = ProductVariant::query()->inventoryOf($store)->get();
        $byId = $variants->keyBy('id');
        $bySku = $variants->filter(fn (ProductVariant $variant): bool => filled($variant->sku))->groupBy(fn (ProductVariant $variant): string => mb_strtolower(trim($variant->sku)));

        $updated = 0;
        $unchanged = 0;
        $errors = [];

        foreach ($rows as $index => $row) {
            $line = (int) ($row['line'] ?? $index + 2);
            [$variant, $message] = $this->match($row, $byId, $bySku);
            [$stock, $cost, $message] = $message ? [null, null, $message] : $this->values($row);

            if ($message) {
                $errors[] = ['row' => $line, 'message' => $message];

                continue;
            }

            $changed = false;

            if ($cost !== null && $cost !== $variant->cost) {
                $variant->forceFill(['cost' => $cost])->save();
                $changed = true;
            }

            if ($stock !== null && $this->changeStock->to($variant, $stock, StockMovementType::Adjustment, StockMovement::ACTOR_VENDOR, __('purchasing.import.note'), $warehouse)) {
                $changed = true;
            }

            $changed ? $updated++ : $unchanged++;
        }

        return ['updated' => $updated, 'unchanged' => $unchanged, 'skipped' => count($errors), 'errors' => $errors];
    }

    /**
     * @param  array<string, mixed>  $row
     * @param  Collection<int, ProductVariant>  $byId
     * @param  Collection<string, Collection<int, ProductVariant>>  $bySku
     * @return array{0: ProductVariant|null, 1: string|null}
     */
    private function match(array $row, Collection $byId, Collection $bySku): array
    {
        $id = trim((string) ($row['variant_id'] ?? ''));

        if ($id !== '') {
            $variant = ctype_digit($id) ? $byId->get((int) $id) : null;

            return [$variant, $variant ? null : __('purchasing.import.not_found')];
        }

        $matches = $bySku->get(mb_strtolower(trim((string) ($row['sku'] ?? ''))));

        return match (true) {
            $matches === null => [null, __('purchasing.import.not_found')],
            $matches->count() > 1 => [null, __('purchasing.import.ambiguous_sku')],
            default => [$matches->first(), null],
        };
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array{0: int|null, 1: float|null, 2: string|null}
     */
    private function values(array $row): array
    {
        $stock = trim((string) ($row['stock'] ?? ''));
        $cost = trim((string) ($row['cost'] ?? ''));

        if ($stock !== '' && ! ctype_digit($stock)) {
            return [null, null, __('purchasing.import.invalid_stock')];
        }

        if ($cost !== '' && (! is_numeric($cost) || (float) $cost < 0)) {
            return [null, null, __('purchasing.import.invalid_cost')];
        }

        return [$stock === '' ? null : (int) $stock, $cost === '' ? null : round((float) $cost, 2), null];
    }
}
