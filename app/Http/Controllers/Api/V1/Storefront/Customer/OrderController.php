<?php

namespace App\Http\Controllers\Api\V1\Storefront\Customer;

use App\Actions\Orders\PlaceOrder;
use App\Actions\Orders\UpdateOrderStatus;
use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Storefront\Customer\PlaceOrderRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\OrderEvent;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    /**
     * The customer's orders in this store, newest first.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        return OrderResource::collection($request->user()->orders()->with('items')->latest('id')->paginate(10));
    }

    public function show(Request $request, Store $store, int $number): OrderResource
    {
        return new OrderResource($this->find($request, $number)->load(['items', 'events']));
    }

    /**
     * Checkout: place a cash-on-delivery order from the cart, delivered to a saved address or
     * a new one (optionally saved to the address book).
     */
    public function store(PlaceOrderRequest $request, Store $store, PlaceOrder $placeOrder): JsonResponse
    {
        $customer = $request->user();
        $address = $request->filled('address_id')
            ? $customer->addresses()->findOrFail($request->validated('address_id'))->toOrderAddress()
            : collect($request->validated('address'))->only(['recipient_name', 'phone', 'governorate_id', 'city_id', 'address_line', 'landmark'])->all();

        $order = $placeOrder->handle($store, $customer, $request->validated('items'), $address, $request->validated('referral_code'), $request->validated('note'), $request->validated('coupon_code'));

        if (! $request->filled('address_id') && $request->boolean('save_address')) {
            AddressController::save($customer, $address);
        }

        return (new OrderResource($order->load(['items', 'events'])))->response()->setStatusCode(Response::HTTP_CREATED);
    }

    /**
     * Customers may cancel their own order until the store confirms it.
     */
    public function cancel(Request $request, Store $store, int $number, UpdateOrderStatus $updateStatus): OrderResource
    {
        $order = $this->find($request, $number);

        if ($order->status !== OrderStatus::Pending) {
            throw ValidationException::withMessages(['status' => __('orders.cannot_cancel')]);
        }

        $reason = $request->validate(['reason' => ['nullable', 'string', 'max:200']])['reason'] ?? null;

        return new OrderResource($updateStatus->handle($order, OrderStatus::Cancelled, OrderEvent::ACTOR_CUSTOMER, $reason)->load(['items', 'events']));
    }

    private function find(Request $request, int $number): Order
    {
        return $request->user()->orders()->where('number', $number)->first() ?? abort(404, __('orders.not_found'));
    }
}
