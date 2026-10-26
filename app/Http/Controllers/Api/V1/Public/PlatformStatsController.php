<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Enums\OrderStatus;
use App\Enums\ProductStatus;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

/**
 * Platform-wide totals for the public landing page: active stores, orders (cancelled ones left out),
 * published products and delivered sales. Cached briefly since every visitor asks for them.
 */
class PlatformStatsController extends Controller
{
    public const CACHE_KEY = 'public.platform-stats';

    public function __invoke(): JsonResponse
    {
        $stats = Cache::remember(self::CACHE_KEY, now()->addMinutes(10), function (): array {
            $orders = Order::query()->toBase()
                ->selectRaw('SUM(CASE WHEN status != ? THEN 1 ELSE 0 END) as placed', [OrderStatus::Cancelled->value])
                ->selectRaw('SUM(CASE WHEN status = ? THEN total ELSE 0 END) as delivered_sales', [OrderStatus::Delivered->value])
                ->first();

            return [
                'stores' => Store::query()->whereNull('suspended_at')->count(),
                'orders' => (int) $orders->placed,
                'products' => Product::query()->where('status', ProductStatus::Active)->count(),
                'sales' => (float) $orders->delivered_sales,
            ];
        });

        return response()->json(['data' => $stats]);
    }
}
