<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Actions\Shipping\ShipWithBosta;
use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\OrderEvent;
use App\Models\StoreShippingAccount;
use App\Support\Shipping\BostaClient;
use App\Support\Shipping\ShippingException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

/**
 * Shipping an order: through the connected Bosta account, or by typing another company's
 * tracking number; plus printing Bosta airway bills.
 */
class OrderShipmentController extends Controller
{
    /** Relations shown on an order's page (see OrderController). */
    private const DETAILS = ['items', 'events', 'customer', 'affiliate', 'saleMovements', 'latestPayment', 'refunds'];

    public function store(Request $request, Order $order, ShipWithBosta $shipWithBosta): OrderResource
    {
        Gate::authorize('update', $order);

        return new OrderResource($shipWithBosta->handle($order, OrderEvent::ACTOR_VENDOR)->load(self::DETAILS));
    }

    /**
     * Another company's name and tracking number, shown to the customer. Bosta shipments
     * keep their own.
     */
    public function updateTracking(Request $request, Order $order): OrderResource
    {
        Gate::authorize('update', $order);
        $validated = $request->validate([
            'carrier' => ['required', 'string', 'max:60'],
            'tracking_number' => ['required', 'string', 'max:60'],
        ]);

        if ($order->carrier === StoreShippingAccount::BOSTA) {
            throw ValidationException::withMessages(['carrier' => __('orders.shipping.already_shipped')]);
        }

        $order->forceFill([...$validated, 'carrier_updated_at' => now()])->save();

        return new OrderResource($order->load(self::DETAILS));
    }

    /**
     * One PDF with the Bosta airway bills of the given orders.
     */
    public function airwayBills(Request $request): Response
    {
        $ids = $request->validate(['ids' => ['required', 'array', 'max:50'], 'ids.*' => ['integer']])['ids'];
        $store = $request->user()->store;
        $account = $store->bostaAccount ?? throw ValidationException::withMessages(['carrier' => __('orders.shipping.bosta_not_connected')]);

        $deliveryIds = $store->orders()->whereIn('id', $ids)->where('carrier', StoreShippingAccount::BOSTA)->whereNotNull('carrier_shipment_id')->pluck('carrier_shipment_id')->all();

        if ($deliveryIds === []) {
            throw ValidationException::withMessages(['ids' => __('orders.shipping.no_bosta_orders')]);
        }

        try {
            $pdf = (new BostaClient($account))->airwayBills($deliveryIds);
        } catch (ShippingException $exception) {
            report($exception);

            throw ValidationException::withMessages(['ids' => __('orders.shipping.bosta_failed', ['reason' => $exception->getMessage()])]);
        }

        return response($pdf, Response::HTTP_OK, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="bosta-airway-bills.pdf"',
        ]);
    }
}
