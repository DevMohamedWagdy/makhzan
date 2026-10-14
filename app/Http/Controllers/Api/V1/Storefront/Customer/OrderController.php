<?php

namespace App\Http\Controllers\Api\V1\Storefront\Customer;

use App\Actions\Orders\PlaceOrder;
use App\Actions\Orders\UpdateOrderStatus;
use App\Actions\Payments\StartPayment;
use App\Actions\Tracking\TrackOrderConversion;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Storefront\Customer\PlaceOrderRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\OrderEvent;
use App\Models\Store;
use App\Support\Tracking\ConversionEvent;
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
        return new OrderResource($this->find($request, $number)->load(['items', 'events', 'latestPayment']));
    }

    /**
     * Checkout: place an order from the cart, delivered to a saved address or a new one
     * (optionally saved to the address book). An online order comes back with
     * `payment.checkout_url` to send the customer to; if the payment page can't be opened,
     * the order is dropped so its stock isn't held.
     */
    public function store(PlaceOrderRequest $request, Store $store, PlaceOrder $placeOrder, StartPayment $startPayment, UpdateOrderStatus $updateStatus, TrackOrderConversion $trackConversion): JsonResponse
    {
        $customer = $request->user();
        $address = $request->filled('address_id')
            ? $customer->addresses()->findOrFail($request->validated('address_id'))->toOrderAddress()
            : collect($request->validated('address'))->only(['recipient_name', 'phone', 'governorate_id', 'city_id', 'address_line', 'landmark'])->all();

        $paymentMethod = PaymentMethod::tryFrom((string) $request->validated('payment_method')) ?? PaymentMethod::Cod;
        $order = $placeOrder->handle($store, $customer, $request->validated('items'), $address, $request->validated('referral_code'), $request->validated('note'), $request->validated('coupon_code'), $paymentMethod);
        $order->forceFill(['tracking' => $request->trackingContext()])->saveQuietly();

        if ($paymentMethod->isOnline()) {
            try {
                $startPayment->handle($order);
            } catch (ValidationException $exception) {
                $updateStatus->handle($order, OrderStatus::Cancelled, OrderEvent::ACTOR_SYSTEM, __('payments.start_failed'));

                throw $exception;
            }
        } else {
            $trackConversion->handle($order, ConversionEvent::PURCHASE);
        }

        if (! $request->filled('address_id') && $request->boolean('save_address')) {
            AddressController::save($customer, $address);
        }

        return (new OrderResource($order->load(['items', 'events', 'latestPayment'])))->response()->setStatusCode(Response::HTTP_CREATED);
    }

    /**
     * Opens a new payment page for an unpaid online order (the last attempt failed, or the
     * customer closed the page), until the order's payment window closes.
     */
    public function pay(Request $request, Store $store, int $number, StartPayment $startPayment): OrderResource
    {
        $order = $this->find($request, $number);
        $startPayment->handle($order);

        return new OrderResource($order->load(['items', 'events', 'latestPayment']));
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

        return new OrderResource($updateStatus->handle($order, OrderStatus::Cancelled, OrderEvent::ACTOR_CUSTOMER, $reason)->load(['items', 'events', 'latestPayment']));
    }

    private function find(Request $request, int $number): Order
    {
        return $request->user()->orders()->where('number', $number)->first() ?? abort(404, __('orders.not_found'));
    }
}
