<?php

namespace App\Actions\Reports;

use App\Enums\CommissionStatus;
use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\Store;
use Carbon\CarbonImmutable;
use Carbon\CarbonPeriod;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

/**
 * Sales report for the orders a store received between two dates (inclusive, by the day the
 * order was placed). "Sales" counts every order that wasn't cancelled or returned; revenue
 * counts delivered orders only, since payment is collected on delivery.
 */
class BuildStoreReport
{
    /** Rows in each ranked list (products, governorates, affiliates). */
    private const TOP = 10;

    /**
     * @return array{
     *     period: array{from: string, to: string, days: int},
     *     totals: array<string, int|float>,
     *     previous: array<string, int|float>,
     *     daily: list<array{date: string, orders: int, sales: float, revenue: float}>,
     *     statuses: array<string, int>,
     *     top_products: list<array{product_id: int|null, name: string, quantity: int, sales: float}>,
     *     governorates: list<array{governorate_id: string, orders: int, sales: float}>,
     *     affiliates: list<array{affiliate_id: int, full_name: string, orders: int, sales: float, commission: float}>
     * }
     */
    public function handle(Store $store, CarbonImmutable $from, CarbonImmutable $to): array
    {
        $from = $from->startOfDay();
        $to = $to->endOfDay();
        $days = (int) $from->diffInDays($to->startOfDay()) + 1;

        return [
            'period' => ['from' => $from->toDateString(), 'to' => $to->toDateString(), 'days' => $days],
            'totals' => $this->totals($store, $from, $to),
            'previous' => $this->totals($store, $from->subDays($days), $from->subSecond()),
            'daily' => $this->daily($store, $from, $to),
            'statuses' => $this->statuses($store, $from, $to),
            'top_products' => $this->topProducts($store, $from, $to),
            'governorates' => $this->governorates($store, $from, $to),
            'affiliates' => $this->affiliates($store, $from, $to),
        ];
    }

    /**
     * @return HasMany<Order, Store>
     */
    private function orders(Store $store, CarbonImmutable $from, CarbonImmutable $to): HasMany
    {
        return $store->orders()->whereBetween('orders.created_at', [$from, $to]);
    }

    /**
     * @return list<string>
     */
    private function failedStatuses(): array
    {
        return [OrderStatus::Cancelled->value, OrderStatus::Returned->value];
    }

    /**
     * @return array{orders: int, sales: float, average_order: float, revenue: float, delivered_orders: int, shipping_fees: float, commissions: float, net_revenue: float, cancelled: int, returned: int, new_customers: int}
     */
    private function totals(Store $store, CarbonImmutable $from, CarbonImmutable $to): array
    {
        [$failedA, $failedB] = $this->failedStatuses();
        $delivered = OrderStatus::Delivered->value;

        $row = $this->orders($store, $from, $to)->toBase()
            ->selectRaw('count(*) as placed')
            ->selectRaw('sum(case when status not in (?, ?) then 1 else 0 end) as orders', [$failedA, $failedB])
            ->selectRaw('coalesce(sum(case when status not in (?, ?) then total else 0 end), 0) as sales', [$failedA, $failedB])
            ->selectRaw('sum(case when status = ? then 1 else 0 end) as delivered_orders', [$delivered])
            ->selectRaw('coalesce(sum(case when status = ? then total else 0 end), 0) as revenue', [$delivered])
            ->selectRaw('coalesce(sum(case when status = ? then shipping_fee else 0 end), 0) as shipping_fees', [$delivered])
            ->selectRaw('coalesce(sum(case when commission_status = ? then commission_amount else 0 end), 0) as commissions', [CommissionStatus::Earned->value])
            ->selectRaw('sum(case when status = ? then 1 else 0 end) as cancelled', [$failedA])
            ->selectRaw('sum(case when status = ? then 1 else 0 end) as returned', [$failedB])
            ->first();

        $orders = (int) $row->orders;
        $sales = round((float) $row->sales, 2);
        $revenue = round((float) $row->revenue, 2);
        $commissions = round((float) $row->commissions, 2);

        return [
            'orders' => $orders,
            'sales' => $sales,
            'average_order' => $orders ? round($sales / $orders, 2) : 0.0,
            'revenue' => $revenue,
            'delivered_orders' => (int) $row->delivered_orders,
            'shipping_fees' => round((float) $row->shipping_fees, 2),
            'commissions' => $commissions,
            'net_revenue' => round($revenue - $commissions, 2),
            'cancelled' => (int) $row->cancelled,
            'returned' => (int) $row->returned,
            'new_customers' => $store->customers()->whereBetween('created_at', [$from, $to])->count(),
        ];
    }

    /**
     * One row per day of the period, including days without orders.
     *
     * @return list<array{date: string, orders: int, sales: float, revenue: float}>
     */
    private function daily(Store $store, CarbonImmutable $from, CarbonImmutable $to): array
    {
        [$failedA, $failedB] = $this->failedStatuses();

        $rows = $this->orders($store, $from, $to)->toBase()
            ->selectRaw('date(created_at) as day')
            ->selectRaw('sum(case when status not in (?, ?) then 1 else 0 end) as orders', [$failedA, $failedB])
            ->selectRaw('coalesce(sum(case when status not in (?, ?) then total else 0 end), 0) as sales', [$failedA, $failedB])
            ->selectRaw('coalesce(sum(case when status = ? then total else 0 end), 0) as revenue', [OrderStatus::Delivered->value])
            ->groupBy(DB::raw('date(created_at)'))
            ->get()
            ->keyBy(fn (object $row): string => substr((string) $row->day, 0, 10));

        return collect(CarbonPeriod::create($from->toDateString(), $to->toDateString()))
            ->map(function ($day) use ($rows): array {
                $row = $rows->get($day->toDateString());

                return [
                    'date' => $day->toDateString(),
                    'orders' => (int) ($row->orders ?? 0),
                    'sales' => round((float) ($row->sales ?? 0), 2),
                    'revenue' => round((float) ($row->revenue ?? 0), 2),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @return array<string, int>
     */
    private function statuses(Store $store, CarbonImmutable $from, CarbonImmutable $to): array
    {
        $counts = $this->orders($store, $from, $to)->toBase()->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');

        return collect(OrderStatus::cases())->mapWithKeys(fn (OrderStatus $status): array => [$status->value => (int) ($counts[$status->value] ?? 0)])->all();
    }

    /**
     * Best sellers by quantity, from orders that weren't cancelled or returned.
     *
     * @return list<array{product_id: int|null, name: string, quantity: int, sales: float}>
     */
    private function topProducts(Store $store, CarbonImmutable $from, CarbonImmutable $to): array
    {
        return DB::table('order_items')
            ->joinSub($this->bookedOrders($store, $from, $to)->select('id'), 'booked', 'booked.id', '=', 'order_items.order_id')
            ->selectRaw('order_items.product_id, max(order_items.product_name) as name, sum(order_items.quantity) as quantity, sum(order_items.line_total) as sales')
            ->groupBy('order_items.product_id')
            ->orderByDesc('quantity')
            ->orderByDesc('sales')
            ->limit(self::TOP)
            ->get()
            ->map(fn (object $row): array => [
                'product_id' => $row->product_id ? (int) $row->product_id : null,
                'name' => $row->name,
                'quantity' => (int) $row->quantity,
                'sales' => round((float) $row->sales, 2),
            ])
            ->all();
    }

    /**
     * @return list<array{governorate_id: string, orders: int, sales: float}>
     */
    private function governorates(Store $store, CarbonImmutable $from, CarbonImmutable $to): array
    {
        return $this->bookedOrders($store, $from, $to)->toBase()
            ->selectRaw('governorate_id, count(*) as orders, sum(total) as sales')
            ->groupBy('governorate_id')
            ->orderByDesc('sales')
            ->limit(self::TOP)
            ->get()
            ->map(fn (object $row): array => ['governorate_id' => $row->governorate_id, 'orders' => (int) $row->orders, 'sales' => round((float) $row->sales, 2)])
            ->all();
    }

    /**
     * Affiliates ranked by the sales their links brought in; commission counts what they earned.
     *
     * @return list<array{affiliate_id: int, full_name: string, orders: int, sales: float, commission: float}>
     */
    private function affiliates(Store $store, CarbonImmutable $from, CarbonImmutable $to): array
    {
        return $this->bookedOrders($store, $from, $to)->toBase()
            ->join('affiliates', 'affiliates.id', '=', 'orders.affiliate_id')
            ->selectRaw('orders.affiliate_id, max(affiliates.full_name) as full_name, count(*) as orders, sum(orders.subtotal) as sales')
            ->selectRaw('coalesce(sum(case when orders.commission_status = ? then orders.commission_amount else 0 end), 0) as commission', [CommissionStatus::Earned->value])
            ->groupBy('orders.affiliate_id')
            ->orderByDesc('sales')
            ->limit(self::TOP)
            ->get()
            ->map(fn (object $row): array => [
                'affiliate_id' => (int) $row->affiliate_id,
                'full_name' => $row->full_name,
                'orders' => (int) $row->orders,
                'sales' => round((float) $row->sales, 2),
                'commission' => round((float) $row->commission, 2),
            ])
            ->all();
    }

    /**
     * Orders in the period that weren't cancelled or returned.
     *
     * @return Builder<Order>
     */
    private function bookedOrders(Store $store, CarbonImmutable $from, CarbonImmutable $to): Builder
    {
        return $this->orders($store, $from, $to)->getQuery()->whereNotIn('orders.status', $this->failedStatuses());
    }
}
