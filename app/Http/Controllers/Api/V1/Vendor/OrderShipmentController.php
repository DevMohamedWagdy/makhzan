<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

/**
 * Shipping an order: the vendor records which company carries it and its tracking number.
 */
class OrderShipmentController extends Controller
{
    private const DETAILS = ['items', 'events', 'customer', 'affiliate', 'saleMovements', 'latestPayment', 'refunds'];

    public function updateTracking(Request $request, Order $order): OrderResource
    {
        Gate::authorize('update', $order);
        $validated = $request->validate([
            'carrier' => ['required', 'string', 'max:60'],
            'tracking_number' => ['required', 'string', 'max:60'],
        ]);

        $order->forceFill([...$validated, 'carrier_updated_at' => now()])->save();

        return new OrderResource($order->load(self::DETAILS));
    }
}
