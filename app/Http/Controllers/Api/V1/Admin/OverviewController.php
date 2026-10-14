<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\OrderStatus;
use App\Enums\SubscriptionRequestStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\ActivityLogResource;
use App\Models\ActivityLog;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Store;
use App\Models\SubscriptionPayment;
use App\Models\SubscriptionRequest;
use App\Models\Vendor;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Platform-wide numbers for the admin home: totals, 30-day series, 12-month subscription
 * revenue, and what needs attention.
 */
class OverviewController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $since = now()->subDays(29)->startOfDay();
        $paidStores = Store::query()->whereNotNull('plan_id')->where('plan_expires_at', '>', now());

        return response()->json(['data' => [
            'stores' => [
                'total' => Store::query()->count(),
                'new_30_days' => Store::query()->where('created_at', '>=', $since)->count(),
                'suspended' => Store::query()->whereNotNull('suspended_at')->count(),
                'paying' => (clone $paidStores)->count(),
                'expiring_7_days' => (clone $paidStores)->where('plan_expires_at', '<=', now()->addDays(7))->count(),
                'on_trial' => Store::query()->withoutActiveSubscription()->where('trial_ends_at', '>', now())->count(),
                'expired' => Store::query()->withoutActiveSubscription()->where(fn (Builder $query) => $query->whereNull('trial_ends_at')->orWhere('trial_ends_at', '<=', now()))->count(),
            ],
            'totals' => [
                'vendors' => Vendor::query()->whereNull('store_id')->count(),
                'staff' => Vendor::query()->whereNotNull('store_id')->count(),
                'products' => Product::query()->count(),
                'customers' => Customer::query()->count(),
                'orders' => Order::query()->count(),
                'delivered_sales' => (float) Order::query()->where('status', OrderStatus::Delivered)->sum('total'),
            ],
            'orders' => [
                'last_30_days' => Order::query()->where('created_at', '>=', $since)->count(),
                'delivered_sales_30_days' => (float) Order::query()->where('status', OrderStatus::Delivered)->where('delivered_at', '>=', $since)->sum('total'),
            ],
            'billing' => [
                'revenue_30_days' => (float) SubscriptionPayment::query()->where('created_at', '>=', $since)->sum('amount'),
                'revenue_total' => (float) SubscriptionPayment::query()->sum('amount'),
                'pending_requests' => SubscriptionRequest::query()->where('status', SubscriptionRequestStatus::Pending)->count(),
            ],
            'plans' => Plan::query()->ordered()->get()->map(fn (Plan $plan): array => [
                'plan_id' => $plan->id,
                'name' => $plan->name,
                'stores' => (clone $paidStores)->where('plan_id', $plan->id)->count(),
            ]),
            'daily' => $this->daily($since),
            'monthly_revenue' => $this->monthlyRevenue(),
            'top_stores' => Store::query()
                ->withSum(['orders as delivered_sales' => fn (Builder $query) => $query->where('status', OrderStatus::Delivered)->where('delivered_at', '>=', $since)], 'total')
                ->orderByDesc('delivered_sales')
                ->limit(5)
                ->get()
                ->filter(fn (Store $store): bool => (float) $store->delivered_sales > 0)
                ->map(fn (Store $store): array => ['store_id' => $store->id, 'name' => $store->name, 'delivered_sales' => (float) $store->delivered_sales])
                ->values(),
            'latest_stores' => Store::query()->with('vendor')->latest('id')->limit(5)->get()->map(fn (Store $store): array => [
                'store_id' => $store->id,
                'name' => $store->name,
                'owner' => $store->vendor->full_name,
                'billing' => $store->billingSummary(),
                'created_at' => $store->created_at?->toIso8601String(),
            ]),
            'trials_ending' => Store::query()->withoutActiveSubscription()->whereBetween('trial_ends_at', [now(), now()->addDays(3)])->orderBy('trial_ends_at')->limit(10)->get()->map(fn (Store $store): array => [
                'store_id' => $store->id,
                'name' => $store->name,
                'trial_ends_at' => $store->trial_ends_at->toIso8601String(),
            ]),
            'recent_activity' => ActivityLogResource::collection(ActivityLog::query()->with('store')->latest('id')->limit(12)->get()),
        ]]);
    }

    /**
     * New stores, orders and delivered sales per day for the last 30 days.
     *
     * @return list<array{date: string, stores: int, orders: int, sales: float}>
     */
    private function daily(Carbon $since): array
    {
        $stores = Store::query()->where('created_at', '>=', $since)->selectRaw('DATE(created_at) as day, COUNT(*) as total')->groupBy('day')->pluck('total', 'day');
        $orders = Order::query()->where('created_at', '>=', $since)
            ->selectRaw('DATE(created_at) as day, COUNT(*) as total, SUM(CASE WHEN status = ? THEN total ELSE 0 END) as sales', [OrderStatus::Delivered->value])
            ->groupBy('day')
            ->get()
            ->keyBy('day');

        return collect(range(0, 29))->map(function (int $offset) use ($since, $stores, $orders): array {
            $day = $since->copy()->addDays($offset)->toDateString();

            return ['date' => $day, 'stores' => (int) ($stores[$day] ?? 0), 'orders' => (int) ($orders[$day]->total ?? 0), 'sales' => (float) ($orders[$day]->sales ?? 0)];
        })->all();
    }

    /**
     * Subscription payments per month for the last 12 months.
     *
     * @return list<array{month: string, revenue: float}>
     */
    private function monthlyRevenue(): array
    {
        $start = now()->subMonths(11)->startOfMonth();

        /** @var Collection<string, float> $byMonth */
        $byMonth = SubscriptionPayment::query()->where('created_at', '>=', $start)->get(['amount', 'created_at'])
            ->groupBy(fn (SubscriptionPayment $payment): string => $payment->created_at->format('Y-m'))
            ->map(fn (Collection $payments): float => (float) $payments->sum('amount'));

        return collect(range(0, 11))->map(function (int $offset) use ($start, $byMonth): array {
            $month = $start->copy()->addMonths($offset)->format('Y-m');

            return ['month' => $month, 'revenue' => $byMonth[$month] ?? 0.0];
        })->all();
    }
}
