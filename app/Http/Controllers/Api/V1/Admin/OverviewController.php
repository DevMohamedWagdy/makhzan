<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\ActivityLogResource;
use App\Models\ActivityLog;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use App\Models\Store;
use App\Models\Vendor;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;

/**
 * Platform-wide numbers for the admin home: totals, 30-day series, top and newest stores,
 * and recent activity.
 */
class OverviewController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $since = now()->subDays(29)->startOfDay();

        return response()->json(['data' => [
            'stores' => [
                'total' => Store::query()->count(),
                'new_30_days' => Store::query()->where('created_at', '>=', $since)->count(),
                'suspended' => Store::query()->whereNotNull('suspended_at')->count(),
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
            'daily' => $this->daily($since),
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
                'created_at' => $store->created_at?->toIso8601String(),
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
}
