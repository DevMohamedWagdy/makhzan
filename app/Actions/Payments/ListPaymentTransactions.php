<?php

namespace App\Actions\Payments;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Models\Store;
use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Every Paymob money movement of a store in one list: each attempt to pay (paid, failed or
 * still open) and each refund, newest first, with the order it belongs to.
 */
class ListPaymentTransactions
{
    /** Payment statuses that mean the money arrived (refunds since don't undo that). */
    public const SUCCESSFUL = [PaymentStatus::Paid, PaymentStatus::PartiallyRefunded, PaymentStatus::Refunded];

    /**
     * @param  array{from?: string|null, to?: string|null, kind?: string|null, status?: string|null, method?: string|null, search?: string|null}  $filters
     */
    public function query(Store $store, array $filters): Builder
    {
        $payments = DB::table('payments')
            ->join('orders', 'orders.id', '=', 'payments.order_id')
            ->where('payments.store_id', $store->id)
            ->selectRaw("'payment' as kind")
            ->addSelect([
                'payments.id', 'payments.order_id', 'orders.number as order_number', 'orders.recipient_name as customer_name', 'payments.method',
                'payments.amount', 'payments.status', 'payments.failure_reason as note', 'payments.gateway_transaction_id as transaction_id',
                'payments.payload', 'payments.created_at',
            ]);

        $refunds = DB::table('payment_refunds')
            ->join('payments', 'payments.id', '=', 'payment_refunds.payment_id')
            ->join('orders', 'orders.id', '=', 'payment_refunds.order_id')
            ->where('payments.store_id', $store->id)
            ->selectRaw("'refund' as kind")
            ->addSelect(['payment_refunds.id', 'payment_refunds.order_id', 'orders.number as order_number', 'orders.recipient_name as customer_name', 'payments.method', 'payment_refunds.amount'])
            ->selectRaw("'refunded' as status")
            ->addSelect(['payment_refunds.reason as note', 'payment_refunds.gateway_reference as transaction_id'])
            ->selectRaw('null as payload')
            ->addSelect('payment_refunds.created_at');

        $search = trim((string) ($filters['search'] ?? ''), " \t#");

        return DB::query()
            ->fromSub($payments->unionAll($refunds), 'transactions')
            ->when($filters['kind'] ?? null, fn (Builder $query, string $kind) => $query->where('kind', $kind))
            ->when($filters['method'] ?? null, fn (Builder $query, string $method) => $query->where('method', $method))
            ->when($filters['status'] ?? null, fn (Builder $query, string $status) => $query
                ->where('kind', 'payment')
                ->whereIn('status', $status === PaymentStatus::Paid->value ? array_map(fn (PaymentStatus $paid): string => $paid->value, self::SUCCESSFUL) : [$status]))
            ->when($filters['from'] ?? null, fn (Builder $query, string $from) => $query->where('created_at', '>=', CarbonImmutable::parse($from)->startOfDay()))
            ->when($filters['to'] ?? null, fn (Builder $query, string $to) => $query->where('created_at', '<=', CarbonImmutable::parse($to)->endOfDay()))
            ->when($search !== '', fn (Builder $query) => $query->where(fn (Builder $query) => $query
                ->where('transaction_id', $search)
                ->when(ctype_digit($search), fn (Builder $query) => $query->orWhere('order_number', (int) $search))))
            ->orderByDesc('created_at')
            ->orderByDesc('kind')
            ->orderByDesc('id');
    }

    /**
     * Totals for the period (all time without dates), plus what needs the vendor's attention
     * now: orders waiting to be paid, and money received for cancelled orders not yet refunded.
     *
     * @param  array{from?: string|null, to?: string|null}  $filters
     * @return array{connected: bool, collected: float, refunded: float, net: float, successful: int, failed: int, awaiting: array{count: int, amount: float}, to_refund: array{count: int, amount: float, order_id: int|null}}
     */
    public function summary(Store $store, array $filters): array
    {
        $from = filled($filters['from'] ?? null) ? CarbonImmutable::parse($filters['from'])->startOfDay() : null;
        $to = filled($filters['to'] ?? null) ? CarbonImmutable::parse($filters['to'])->endOfDay() : null;
        $period = fn (Builder $query, string $column) => $query
            ->when($from, fn (Builder $query) => $query->where($column, '>=', $from))
            ->when($to, fn (Builder $query) => $query->where($column, '<=', $to));
        $successful = array_map(fn (PaymentStatus $status): string => $status->value, self::SUCCESSFUL);

        $payments = DB::table('payments')->where('store_id', $store->id);
        $collected = (float) $period((clone $payments)->whereIn('status', $successful), 'paid_at')->sum('amount');
        $successfulCount = $period((clone $payments)->whereIn('status', $successful), 'paid_at')->count();
        $failed = $period((clone $payments)->where('status', PaymentStatus::Failed->value), 'created_at')->count();
        $refunded = (float) $period(DB::table('payment_refunds')->join('payments', 'payments.id', '=', 'payment_refunds.payment_id')->where('payments.store_id', $store->id), 'payment_refunds.created_at')->sum('payment_refunds.amount');

        $awaiting = $store->orders()->toBase()
            ->where('status', OrderStatus::Pending->value)
            ->whereIn('payment_status', [PaymentStatus::Pending->value, PaymentStatus::Failed->value])
            ->selectRaw('count(*) as count, coalesce(sum(total), 0) as amount')
            ->first();

        $toRefund = $store->orders()->toBase()
            ->where('status', OrderStatus::Cancelled->value)
            ->whereIn('payment_status', [PaymentStatus::Paid->value, PaymentStatus::PartiallyRefunded->value])
            ->selectRaw('count(*) as count, coalesce(sum(total - refunded_amount), 0) as amount, min(id) as order_id')
            ->first();

        return [
            'connected' => $store->paymentGateway()->exists(),
            'collected' => round($collected, 2),
            'refunded' => round($refunded, 2),
            'net' => round($collected - $refunded, 2),
            'successful' => $successfulCount,
            'failed' => $failed,
            'awaiting' => ['count' => (int) $awaiting->count, 'amount' => round((float) $awaiting->amount, 2)],
            'to_refund' => ['count' => (int) $toRefund->count, 'amount' => round((float) $toRefund->amount, 2), 'order_id' => $toRefund->order_id ? (int) $toRefund->order_id : null],
        ];
    }
}
