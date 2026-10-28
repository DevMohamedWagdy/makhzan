<?php

namespace App\Support\Purchasing;

use App\Enums\StockMovementType;
use App\Models\Store;
use App\Models\Supplier;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * What a store owes its suppliers: the value of goods received on their purchase orders (each receipt at
 * the order's unit cost), less what was sent back to them and what was paid.
 */
class SupplierAccounts
{
    /**
     * Received, returned, paid and the balance still owed, per supplier id.
     *
     * @param  list<int>|null  $supplierIds  all the store's suppliers when null
     * @return array<int, array{received: float, returned: float, paid: float, balance: float}>
     */
    public static function balances(Store $store, ?array $supplierIds = null): array
    {
        $received = DB::table('stock_movements')
            ->join('purchase_orders', 'purchase_orders.id', '=', 'stock_movements.purchase_order_id')
            ->where('stock_movements.store_id', $store->id)
            ->where('stock_movements.type', StockMovementType::Restock->value)
            ->when($supplierIds !== null, fn ($query) => $query->whereIn('purchase_orders.supplier_id', $supplierIds))
            ->groupBy('purchase_orders.supplier_id')
            ->selectRaw('purchase_orders.supplier_id, sum(stock_movements.quantity * coalesce(stock_movements.unit_cost, 0)) as total')
            ->pluck('total', 'supplier_id');

        $returned = self::sumBySupplier('purchase_returns', 'total', $store, $supplierIds);
        $paid = self::sumBySupplier('supplier_payments', 'amount', $store, $supplierIds);

        return collect($supplierIds ?? $store->suppliers()->pluck('id')->all())
            ->mapWithKeys(function (int $supplierId) use ($received, $returned, $paid): array {
                $account = [
                    'received' => round((float) ($received[$supplierId] ?? 0), 2),
                    'returned' => round((float) ($returned[$supplierId] ?? 0), 2),
                    'paid' => round((float) ($paid[$supplierId] ?? 0), 2),
                ];

                return [$supplierId => [...$account, 'balance' => round($account['received'] - $account['returned'] - $account['paid'], 2)]];
            })
            ->all();
    }

    /**
     * The supplier's account as entries, newest first, each with the balance right after it: receipts
     * (one per receiving of a purchase order), payments and returns.
     *
     * @return list<array{type: 'receipt'|'payment'|'return', id: int, date: string, reference: string|null, description: string|null, debit: float, credit: float, balance: float}>
     */
    public static function statement(Supplier $supplier): array
    {
        $receipts = DB::table('stock_movements')
            ->join('purchase_orders', 'purchase_orders.id', '=', 'stock_movements.purchase_order_id')
            ->where('stock_movements.store_id', $supplier->store_id)
            ->where('purchase_orders.supplier_id', $supplier->id)
            ->where('stock_movements.type', StockMovementType::Restock->value)
            ->groupBy('purchase_orders.id', 'purchase_orders.number', 'stock_movements.created_at')
            ->selectRaw('purchase_orders.id, purchase_orders.number, stock_movements.created_at, sum(stock_movements.quantity) as units, sum(stock_movements.quantity * coalesce(stock_movements.unit_cost, 0)) as total')
            ->get()
            ->map(fn (object $receipt): array => [
                'type' => 'receipt',
                'id' => (int) $receipt->id,
                'date' => (string) $receipt->created_at,
                'reference' => '#'.$receipt->number,
                'description' => __('purchasing.statement_receipt', ['units' => (int) $receipt->units]),
                'debit' => round((float) $receipt->total, 2),
                'credit' => 0.0,
            ]);

        $payments = $supplier->payments()->get()->map(fn ($payment): array => [
            'type' => 'payment',
            'id' => $payment->id,
            // Payments carry a day only: order them by the day, then by when they were recorded.
            'date' => $payment->paid_at->toDateString().' '.$payment->created_at->format('H:i:s'),
            'reference' => $payment->reference,
            'description' => trim(__('purchasing.payment_methods.'.$payment->method).($payment->note ? ' — '.$payment->note : '')),
            'debit' => 0.0,
            'credit' => (float) $payment->amount,
        ]);

        $returns = $supplier->purchaseReturns()->get()->map(fn ($return): array => [
            'type' => 'return',
            'id' => $return->id,
            'date' => (string) $return->created_at,
            'reference' => '#'.$return->number,
            'description' => $return->note,
            'debit' => 0.0,
            'credit' => (float) $return->total,
        ]);

        $balance = 0.0;

        return $receipts->concat($payments)->concat($returns)
            ->sortBy('date')
            ->values()
            ->map(function (array $entry) use (&$balance): array {
                $balance = round($balance + $entry['debit'] - $entry['credit'], 2);

                return [...$entry, 'balance' => $balance];
            })
            ->reverse()
            ->values()
            ->all();
    }

    /**
     * @param  list<int>|null  $supplierIds
     * @return Collection<int, mixed>
     */
    private static function sumBySupplier(string $table, string $column, Store $store, ?array $supplierIds)
    {
        return DB::table($table)
            ->where('store_id', $store->id)
            ->when($supplierIds !== null, fn ($query) => $query->whereIn('supplier_id', $supplierIds))
            ->groupBy('supplier_id')
            ->selectRaw("supplier_id, sum({$column}) as total")
            ->pluck('total', 'supplier_id');
    }
}
