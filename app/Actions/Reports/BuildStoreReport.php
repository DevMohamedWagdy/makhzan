<?php

namespace App\Actions\Reports;

use App\Enums\CommissionStatus;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Order;
use App\Models\ProductVariant;
use App\Models\Store;
use Carbon\CarbonImmutable;
use Carbon\CarbonPeriod;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

/**
 * Sales report for the orders a store received between two dates (inclusive, by the day the
 * order was placed). "Sales" counts every order that wasn't cancelled or returned; revenue
 * counts delivered orders only, since payment is collected on delivery. Gross profit is the
 * delivered products' value minus their cost (snapshotted when ordered) and affiliate
 * commissions; items sold before a cost was set are counted in `uncosted_items`. Online
 * orders count once they're paid; an unpaid checkout isn't an order yet.
 */
class BuildStoreReport
{
    /** Rows in each ranked list (products, governorates, affiliates). */
    private const TOP = 10;

    /** Days of recent sales the stock forecast averages over. */
    private const FORECAST_WINDOW_DAYS = 30;

    /** Variants expected to sell out within this many days are flagged by the forecast. */
    private const FORECAST_HORIZON_DAYS = 30;

    /**
     * @return array{
     *     period: array{from: string, to: string, days: int},
     *     totals: array<string, int|float>,
     *     previous: array<string, int|float>,
     *     daily: list<array{date: string, orders: int, sales: float, revenue: float}>,
     *     statuses: array<string, int>,
     *     top_products: list<array{product_id: int|null, name: string, quantity: int, sales: float}>,
     *     profitable_products: list<array{product_id: int|null, name: string, quantity: int, sales: float, cost: float, profit: float, margin: float|null}>,
     *     governorates: list<array{governorate_id: string, orders: int, sales: float}>,
     *     governorate_returns: list<array{governorate_id: string, orders: int, delivered: int, returned: int, cancelled: int, return_rate: float|null}>,
     *     stock_forecast: list<array{variant_id: int, product_id: int, name: string, variant_title: string, stock: int, sold: int, daily_rate: float, days_left: int}>,
     *     payment_methods: list<array{method: string, orders: int, sales: float}>,
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
            'profitable_products' => $this->profitableProducts($store, $from, $to),
            'governorates' => $this->governorates($store, $from, $to),
            'governorate_returns' => $this->governorateReturns($store, $from, $to),
            'stock_forecast' => $this->stockForecast($store),
            'payment_methods' => $this->paymentMethods($store, $from, $to),
            'affiliates' => $this->affiliates($store, $from, $to),
        ];
    }

    /**
     * @return HasMany<Order, Store>
     */
    private function orders(Store $store, CarbonImmutable $from, CarbonImmutable $to): HasMany
    {
        return $store->orders()
            ->whereBetween('orders.created_at', [$from, $to])
            ->where(fn ($query) => $query->whereNull('orders.payment_status')->orWhereNotIn('orders.payment_status', [PaymentStatus::Pending->value, PaymentStatus::Failed->value]));
    }

    /**
     * @return list<string>
     */
    private function failedStatuses(): array
    {
        return [OrderStatus::Cancelled->value, OrderStatus::Returned->value];
    }

    /**
     * @return array{orders: int, sales: float, average_order: float, revenue: float, discounts: float, delivered_orders: int, shipping_fees: float, commissions: float, net_revenue: float, cost_of_goods: float, gross_profit: float, profit_margin: float|null, uncosted_items: int, cancelled: int, returned: int, refunds: float, new_customers: int}
     */
    private function totals(Store $store, CarbonImmutable $from, CarbonImmutable $to): array
    {
        [$failedA, $failedB] = $this->failedStatuses();
        $delivered = OrderStatus::Delivered->value;

        $row = $this->orders($store, $from, $to)->toBase()
            ->selectRaw('count(*) as placed')
            ->selectRaw('sum(case when status not in (?, ?) then 1 else 0 end) as orders', [$failedA, $failedB])
            ->selectRaw('coalesce(sum(case when status not in (?, ?) then total else 0 end), 0) as sales', [$failedA, $failedB])
            ->selectRaw('coalesce(sum(case when status not in (?, ?) then discount + shipping_discount else 0 end), 0) as discounts', [$failedA, $failedB])
            ->selectRaw('sum(case when status = ? then 1 else 0 end) as delivered_orders', [$delivered])
            ->selectRaw('coalesce(sum(case when status = ? then total else 0 end), 0) as revenue', [$delivered])
            ->selectRaw('coalesce(sum(case when status = ? then shipping_fee else 0 end), 0) as shipping_fees', [$delivered])
            ->selectRaw('coalesce(sum(case when commission_status = ? then commission_amount else 0 end), 0) as commissions', [CommissionStatus::Earned->value])
            ->selectRaw('sum(case when status = ? then 1 else 0 end) as cancelled', [$failedA])
            ->selectRaw('sum(case when status = ? then 1 else 0 end) as returned', [$failedB])
            ->selectRaw('coalesce(sum(refunded_amount), 0) as refunds')
            ->first();

        $orders = (int) $row->orders;
        $sales = round((float) $row->sales, 2);
        $revenue = round((float) $row->revenue, 2);
        $commissions = round((float) $row->commissions, 2);

        $goods = DB::table('order_items')
            ->joinSub($this->orders($store, $from, $to)->getQuery()->where('orders.status', $delivered)->select('id'), 'delivered', 'delivered.id', '=', 'order_items.order_id')
            ->selectRaw('coalesce(sum(order_items.line_total), 0) as products')
            ->selectRaw('coalesce(sum(order_items.unit_cost * order_items.quantity), 0) as cost')
            ->selectRaw('coalesce(sum(case when order_items.unit_cost is null then order_items.quantity else 0 end), 0) as uncosted')
            ->first();

        $products = round((float) $goods->products, 2);
        $costOfGoods = round((float) $goods->cost, 2);
        $grossProfit = round($products - $costOfGoods - $commissions, 2);

        return [
            'orders' => $orders,
            'sales' => $sales,
            'average_order' => $orders ? round($sales / $orders, 2) : 0.0,
            'revenue' => $revenue,
            'delivered_orders' => (int) $row->delivered_orders,
            'shipping_fees' => round((float) $row->shipping_fees, 2),
            'commissions' => $commissions,
            'net_revenue' => round($revenue - $commissions, 2),
            'discounts' => round((float) $row->discounts, 2),
            'cost_of_goods' => $costOfGoods,
            'gross_profit' => $grossProfit,
            'profit_margin' => $products > 0 ? round($grossProfit / $products * 100, 1) : null,
            'uncosted_items' => (int) $goods->uncosted,
            'cancelled' => (int) $row->cancelled,
            'returned' => (int) $row->returned,
            'refunds' => round((float) $row->refunds, 2),
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
     * Orders and sales by how they were paid, every method listed.
     *
     * @return list<array{method: string, orders: int, sales: float}>
     */
    private function paymentMethods(Store $store, CarbonImmutable $from, CarbonImmutable $to): array
    {
        $rows = $this->bookedOrders($store, $from, $to)->toBase()
            ->selectRaw('payment_method, count(*) as orders, sum(total) as sales')
            ->groupBy('payment_method')
            ->get()
            ->keyBy('payment_method');

        return array_map(fn (PaymentMethod $method): array => [
            'method' => $method->value,
            'orders' => (int) ($rows[$method->value]->orders ?? 0),
            'sales' => round((float) ($rows[$method->value]->sales ?? 0), 2),
        ], PaymentMethod::cases());
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
     * Products ranked by the profit their delivered sales made: what they sold for minus their
     * cost. Lines sold before a cost was set are left out, since their profit is unknown.
     *
     * @return list<array{product_id: int|null, name: string, quantity: int, sales: float, cost: float, profit: float, margin: float|null}>
     */
    private function profitableProducts(Store $store, CarbonImmutable $from, CarbonImmutable $to): array
    {
        return DB::table('order_items')
            ->joinSub($this->orders($store, $from, $to)->getQuery()->where('orders.status', OrderStatus::Delivered->value)->select('id'), 'delivered', 'delivered.id', '=', 'order_items.order_id')
            ->whereNotNull('order_items.unit_cost')
            ->selectRaw('order_items.product_id, max(order_items.product_name) as name, sum(order_items.quantity) as quantity')
            ->selectRaw('sum(order_items.line_total) as sales, sum(order_items.unit_cost * order_items.quantity) as cost')
            ->selectRaw('sum(order_items.line_total - order_items.unit_cost * order_items.quantity) as profit')
            ->groupBy('order_items.product_id')
            ->orderByDesc('profit')
            ->limit(self::TOP)
            ->get()
            ->map(function (object $row): array {
                $sales = round((float) $row->sales, 2);
                $profit = round((float) $row->profit, 2);

                return [
                    'product_id' => $row->product_id ? (int) $row->product_id : null,
                    'name' => $row->name,
                    'quantity' => (int) $row->quantity,
                    'sales' => $sales,
                    'cost' => round((float) $row->cost, 2),
                    'profit' => $profit,
                    'margin' => $sales > 0 ? round($profit / $sales * 100, 1) : null,
                ];
            })
            ->all();
    }

    /**
     * How often orders to each governorate come back. The return rate is returned orders out of
     * those that reached the customer's door (delivered or returned); orders still on the way
     * don't count yet. Governorates with the most orders come first.
     *
     * @return list<array{governorate_id: string, orders: int, delivered: int, returned: int, cancelled: int, return_rate: float|null}>
     */
    private function governorateReturns(Store $store, CarbonImmutable $from, CarbonImmutable $to): array
    {
        return $this->orders($store, $from, $to)->toBase()
            ->selectRaw('governorate_id, count(*) as orders')
            ->selectRaw('sum(case when status = ? then 1 else 0 end) as delivered', [OrderStatus::Delivered->value])
            ->selectRaw('sum(case when status = ? then 1 else 0 end) as returned', [OrderStatus::Returned->value])
            ->selectRaw('sum(case when status = ? then 1 else 0 end) as cancelled', [OrderStatus::Cancelled->value])
            ->groupBy('governorate_id')
            ->orderByDesc('orders')
            ->limit(self::TOP)
            ->get()
            ->map(function (object $row): array {
                $delivered = (int) $row->delivered;
                $returned = (int) $row->returned;

                return [
                    'governorate_id' => $row->governorate_id,
                    'orders' => (int) $row->orders,
                    'delivered' => $delivered,
                    'returned' => $returned,
                    'cancelled' => (int) $row->cancelled,
                    'return_rate' => $delivered + $returned > 0 ? round($returned / ($delivered + $returned) * 100, 1) : null,
                ];
            })
            ->all();
    }

    /**
     * Variants that will sell out soon at their recent pace: units sold in the last
     * FORECAST_WINDOW_DAYS (orders not cancelled or returned) averaged per day, against what's
     * on the shelf now. Independent of the report period; soonest to run out first, with
     * variants already sold out (days_left 0) at the top.
     *
     * @return list<array{variant_id: int, product_id: int, name: string, variant_title: string, stock: int, sold: int, daily_rate: float, days_left: int}>
     */
    private function stockForecast(Store $store): array
    {
        $to = CarbonImmutable::now();
        $from = $to->subDays(self::FORECAST_WINDOW_DAYS);

        $sold = DB::table('order_items')
            ->joinSub($this->orders($store, $from, $to)->getQuery()->whereNotIn('orders.status', $this->failedStatuses())->select('id'), 'booked', 'booked.id', '=', 'order_items.order_id')
            ->whereNotNull('order_items.product_variant_id')
            ->selectRaw('order_items.product_variant_id, sum(order_items.quantity) as sold')
            ->groupBy('order_items.product_variant_id')
            ->pluck('sold', 'product_variant_id');

        if ($sold->isEmpty()) {
            return [];
        }

        return ProductVariant::query()
            ->inventoryOf($store)
            ->whereIn('product_variants.id', $sold->keys())
            ->addSelect('products.name as product_name')
            ->get()
            ->map(function (ProductVariant $variant) use ($sold): array {
                $unitsSold = (int) $sold[$variant->id];
                $dailyRate = $unitsSold / self::FORECAST_WINDOW_DAYS;

                return [
                    'variant_id' => $variant->id,
                    'product_id' => $variant->product_id,
                    'name' => $variant->product_name,
                    'variant_title' => $variant->title(),
                    'stock' => $variant->stock,
                    'sold' => $unitsSold,
                    'daily_rate' => round($dailyRate, 2),
                    'days_left' => (int) floor($variant->stock / $dailyRate),
                ];
            })
            ->filter(fn (array $row): bool => $row['days_left'] <= self::FORECAST_HORIZON_DAYS)
            ->sortBy([['days_left', 'asc'], ['daily_rate', 'desc']])
            ->take(self::TOP)
            ->values()
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
