<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Actions\Orders\UpdateOrderStatus;
use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\AdminOrderResource;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\OrderEvent;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

/**
 * Every order on the platform, across stores.
 */
class OrderController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'store_id' => ['nullable', 'integer'],
            'status' => ['nullable', Rule::enum(OrderStatus::class)],
            'search' => ['nullable', 'string', 'max:100'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $orders = Order::query()
            ->with('store')
            ->withCount('items')
            ->when($filters['store_id'] ?? null, fn ($query, int $id) => $query->where('store_id', $id))
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->search($filters['search'] ?? null)
            ->when($filters['from'] ?? null, fn ($query, string $from) => $query->where('created_at', '>=', $from))
            ->when($filters['to'] ?? null, fn ($query, string $to) => $query->where('created_at', '<=', $to.' 23:59:59'))
            ->latest('id')
            ->paginate(30)
            ->withQueryString();

        return AdminOrderResource::collection($orders);
    }

    public function show(Order $order): OrderResource
    {
        return (new OrderResource($order->load(['items', 'events', 'customer', 'affiliate', 'latestPayment', 'refunds', 'store'])))->additional([
            'store' => ['store_id' => $order->store->id, 'name' => $order->store->name, 'slug' => $order->store->slug],
        ]);
    }

    /**
     * Moves an order to another status on the store's behalf (stock, points and commissions
     * follow as usual). Logged as the platform admin in the order's history.
     */
    public function updateStatus(Request $request, Order $order, UpdateOrderStatus $updateStatus): OrderResource
    {
        $validated = $request->validate([
            'status' => ['required', Rule::enum(OrderStatus::class)],
            'note' => ['nullable', 'string', 'max:200'],
        ]);

        $updateStatus->handle($order, OrderStatus::from($validated['status']), OrderEvent::ACTOR_ADMIN, $validated['note'] ?? null);

        return $this->show($order->refresh());
    }
}
