<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\AffiliateStatus;
use App\Enums\CommissionStatus;
use App\Enums\OrderStatus;
use App\Enums\ProductStatus;
use App\Http\Controllers\Controller;
use App\Models\Affiliate;
use App\Models\Order;
use App\Models\Product;
use App\Models\Store;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;

/**
 * Platform-wide numbers for the admin home: stores, orders, affiliates and products,
 * 30-day series of new stores and orders, and the top stores and affiliates.
 */
class OverviewController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $orders = Order::query()->toBase()
            ->selectRaw('COUNT(*) as total')
            ->selectRaw('SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as delivered', [OrderStatus::Delivered->value])
            ->selectRaw('SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as cancelled', [OrderStatus::Cancelled->value])
            ->selectRaw('SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as returned', [OrderStatus::Returned->value])
            ->selectRaw('SUM(CASE WHEN status = ? THEN total ELSE 0 END) as delivered_sales', [OrderStatus::Delivered->value])
            ->first();

        $affiliates = Affiliate::query()->toBase()->selectRaw('status, COUNT(*) as total')->groupBy('status')->pluck('total', 'status');
        $storesTotal = Store::query()->count();
        $suspended = Store::query()->whereNotNull('suspended_at')->count();

        return response()->json(['data' => [
            'stores' => [
                'total' => $storesTotal,
                'active' => $storesTotal - $suspended,
                'suspended' => $suspended,
            ],
            'orders' => [
                'total' => (int) $orders->total,
                'delivered' => (int) $orders->delivered,
                'cancelled' => (int) $orders->cancelled,
                'returned' => (int) $orders->returned,
                'delivered_sales' => (float) $orders->delivered_sales,
            ],
            'affiliates' => [
                'total' => (int) $affiliates->sum(),
                'active' => (int) ($affiliates[AffiliateStatus::Active->value] ?? 0),
                'frozen' => (int) ($affiliates[AffiliateStatus::Frozen->value] ?? 0),
                'pending' => (int) ($affiliates[AffiliateStatus::Pending->value] ?? 0),
                'earned_commission' => (float) Order::query()->where('commission_status', CommissionStatus::Earned)->sum('commission_amount'),
            ],
            'products' => [
                'total' => Product::query()->count(),
                'published' => Product::query()->where('status', ProductStatus::Active)->count(),
            ],
            'daily' => $this->daily(now()->subDays(29)->startOfDay()),
            'top_stores' => $this->topStores(),
            'top_affiliates' => $this->topAffiliates(),
        ]]);
    }

    /**
     * New stores and orders per day for the last 30 days.
     *
     * @return list<array{date: string, stores: int, orders: int}>
     */
    private function daily(Carbon $since): array
    {
        $stores = Store::query()->where('created_at', '>=', $since)->selectRaw('DATE(created_at) as day, COUNT(*) as total')->groupBy('day')->pluck('total', 'day');
        $orders = Order::query()->where('created_at', '>=', $since)->selectRaw('DATE(created_at) as day, COUNT(*) as total')->groupBy('day')->pluck('total', 'day');

        return collect(range(0, 29))->map(function (int $offset) use ($since, $stores, $orders): array {
            $day = $since->copy()->addDays($offset)->toDateString();

            return ['date' => $day, 'stores' => (int) ($stores[$day] ?? 0), 'orders' => (int) ($orders[$day] ?? 0)];
        })->all();
    }

    /**
     * The five stores with the most delivered sales.
     *
     * @return list<array{store_id: int, name: string, delivered_orders: int, delivered_sales: float}>
     */
    private function topStores(): array
    {
        $delivered = fn (Builder $query) => $query->where('status', OrderStatus::Delivered);

        return Store::query()
            ->withCount(['orders as delivered_orders' => $delivered])
            ->withSum(['orders as delivered_sales' => $delivered], 'total')
            ->orderByDesc('delivered_sales')
            ->limit(5)
            ->get()
            ->filter(fn (Store $store): bool => (float) $store->delivered_sales > 0)
            ->map(fn (Store $store): array => [
                'store_id' => $store->id,
                'name' => $store->name,
                'delivered_orders' => (int) $store->delivered_orders,
                'delivered_sales' => (float) $store->delivered_sales,
            ])
            ->values()
            ->all();
    }

    /**
     * The five affiliates with the most earned commission across all stores.
     *
     * @return list<array{affiliate_id: int, name: string, store: array{store_id: int, name: string}|null, delivered_orders: int, earned_commission: float}>
     */
    private function topAffiliates(): array
    {
        return Affiliate::query()
            ->with('store:id,name')
            ->withCount(['orders as delivered_orders' => fn (Builder $query) => $query->where('status', OrderStatus::Delivered)])
            ->withSum(['orders as confirmed_commission' => fn (Builder $query) => $query->where('commission_status', CommissionStatus::Earned)], 'commission_amount')
            ->orderByDesc('confirmed_commission')
            ->limit(5)
            ->get()
            ->filter(fn (Affiliate $affiliate): bool => (float) $affiliate->confirmed_commission > 0)
            ->map(fn (Affiliate $affiliate): array => [
                'affiliate_id' => $affiliate->id,
                'name' => $affiliate->full_name,
                'store' => $affiliate->store ? ['store_id' => $affiliate->store->id, 'name' => $affiliate->store->name] : null,
                'delivered_orders' => (int) $affiliate->delivered_orders,
                'earned_commission' => (float) $affiliate->confirmed_commission,
            ])
            ->values()
            ->all();
    }
}
