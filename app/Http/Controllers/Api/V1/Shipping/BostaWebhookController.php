<?php

namespace App\Http\Controllers\Api\V1\Shipping;

use App\Actions\Shipping\RecordCarrierUpdate;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Store;
use App\Models\StoreShippingAccount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Bosta's per-order status updates. Bosta doesn't sign webhooks, so each delivery is created
 * with our secret in the X-Bosta-Secret header and requests without it are refused.
 */
class BostaWebhookController extends Controller
{
    public function __invoke(Request $request, Store $store, Order $order, RecordCarrierUpdate $recordUpdate): JsonResponse
    {
        $secret = $store->bostaAccount?->credential('webhook_secret');

        abort_unless($secret && hash_equals($secret, (string) $request->header('X-Bosta-Secret')), Response::HTTP_UNAUTHORIZED);
        abort_unless($order->store_id === $store->id && $order->carrier === StoreShippingAccount::BOSTA, Response::HTTP_NOT_FOUND);

        $state = $request->input('state', $request->input('state.code'));

        if (is_numeric($state)) {
            $recordUpdate->handle($order, (int) $state, $request->input('description') ?? $request->input('state.value'));
        }

        return response()->json(['status' => 'success']);
    }
}
