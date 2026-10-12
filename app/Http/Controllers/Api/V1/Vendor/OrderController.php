<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Actions\Orders\UpdateOrderStatus;
use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Vendor\ListOrdersRequest;
use App\Http\Requests\Api\V1\Vendor\UpdateOrderStatusRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\OrderEvent;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class OrderController extends Controller
{
    /**
     * The store's orders, newest first, filtered by status, search, affiliate attribution or customer.
     */
    public function index(ListOrdersRequest $request): AnonymousResourceCollection
    {
        $filters = $request->validated();

        $orders = $request->user()->store->orders()
            ->with(['items', 'customer', 'affiliate'])
            ->search($filters['search'] ?? null)
            ->when($filters['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->when($request->boolean('affiliate'), fn ($query) => $query->whereNotNull('affiliate_id'))
            ->when($filters['affiliate_id'] ?? null, fn ($query, $affiliateId) => $query->where('affiliate_id', $affiliateId))
            ->when($filters['customer_id'] ?? null, fn ($query, $customerId) => $query->where('customer_id', $customerId))
            ->latest('id')
            ->paginate($filters['per_page'] ?? 20)
            ->withQueryString();

        return OrderResource::collection($orders);
    }

    public function show(Order $order): OrderResource
    {
        Gate::authorize('view', $order);

        return new OrderResource($order->load(['items', 'events', 'customer', 'affiliate']));
    }

    /**
     * Confirm, ship, deliver, cancel or mark returned (see OrderStatus::next()).
     */
    public function updateStatus(UpdateOrderStatusRequest $request, Order $order, UpdateOrderStatus $updateStatus): OrderResource
    {
        $updated = $updateStatus->handle($order, OrderStatus::from($request->validated('status')), OrderEvent::ACTOR_VENDOR, $request->validated('note'));

        return new OrderResource($updated->load(['items', 'events', 'customer', 'affiliate']));
    }
}
