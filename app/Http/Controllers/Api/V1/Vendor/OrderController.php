<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Actions\Orders\RecordManualOrder;
use App\Actions\Orders\UpdateOrderStatus;
use App\Actions\Payments\RefundPayment;
use App\Enums\OrderSource;
use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Vendor\ListOrdersRequest;
use App\Http\Requests\Api\V1\Vendor\RefundOrderRequest;
use App\Http\Requests\Api\V1\Vendor\StoreManualOrderRequest;
use App\Http\Requests\Api\V1\Vendor\UpdateOrderStatusRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\OrderEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

class OrderController extends Controller
{
    /** Relations shown on an order's page. */
    private const DETAILS = ['items', 'events', 'customer', 'affiliate', 'saleMovements', 'latestPayment', 'refunds'];

    /**
     * The store's orders, newest first, filtered by status, search, source, affiliate attribution, customer,
     * coupon, payment method, payment status or a list of order ids.
     */
    public function index(ListOrdersRequest $request): AnonymousResourceCollection
    {
        $filters = $request->validated();

        $orders = $request->user()->store->orders()
            ->with(['items', 'customer', 'affiliate'])
            ->search($filters['search'] ?? null)
            ->when($filters['ids'] ?? null, fn ($query, $ids) => $query->whereIn('id', $ids))
            ->when($filters['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->when($filters['source'] ?? null, fn ($query, $source) => $query->where('source', $source))
            ->when($request->boolean('affiliate'), fn ($query) => $query->whereNotNull('affiliate_id'))
            ->when($filters['affiliate_id'] ?? null, fn ($query, $affiliateId) => $query->where('affiliate_id', $affiliateId))
            ->when($filters['customer_id'] ?? null, fn ($query, $customerId) => $query->where('customer_id', $customerId))
            ->when($filters['coupon_id'] ?? null, fn ($query, $couponId) => $query->where('coupon_id', $couponId))
            ->when($filters['payment_method'] ?? null, fn ($query, $method) => $query->where('payment_method', $method))
            ->when($filters['payment_status'] ?? null, fn ($query, $status) => $query->where('payment_status', $status))
            ->latest('id')
            ->paginate($filters['per_page'] ?? 20)
            ->withQueryString();

        return OrderResource::collection($orders);
    }

    /**
     * Records an order taken on WhatsApp, Messenger, the phone or in person (see RecordManualOrder).
     */
    public function store(StoreManualOrderRequest $request, RecordManualOrder $recordManualOrder): JsonResponse
    {
        $store = $request->user()->store;
        $order = $recordManualOrder->handle(
            $store,
            OrderSource::from($request->validated('source')),
            $request->validated('items'),
            collect($request->validated('address'))->only(['recipient_name', 'phone', 'governorate_id', 'city_id', 'address_line', 'landmark'])->all(),
            $request->filled('customer_id') ? $store->customers()->find($request->validated('customer_id')) : null,
            $request->filled('shipping_fee') ? (float) $request->validated('shipping_fee') : null,
            (float) $request->validated('discount', 0),
            $request->validated('note'),
            $request->boolean('confirm'),
        );

        return (new OrderResource($order->load(self::DETAILS)))->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Order $order): OrderResource
    {
        Gate::authorize('view', $order);

        return new OrderResource($order->load(self::DETAILS));
    }

    /**
     * Confirm, ship, deliver, cancel or mark returned (see OrderStatus::next()).
     */
    public function updateStatus(UpdateOrderStatusRequest $request, Order $order, UpdateOrderStatus $updateStatus): OrderResource
    {
        $updated = $updateStatus->handle($order, OrderStatus::from($request->validated('status')), OrderEvent::ACTOR_VENDOR, $request->validated('note'));

        return new OrderResource($updated->load(self::DETAILS));
    }

    /**
     * Sends part or all of an online payment back to the customer through Paymob.
     */
    public function refund(RefundOrderRequest $request, Order $order, RefundPayment $refundPayment): OrderResource
    {
        $refunded = $refundPayment->handle($order, (float) $request->validated('amount'), $request->validated('reason'), OrderEvent::ACTOR_VENDOR);

        return new OrderResource($refunded->load(self::DETAILS));
    }
}
