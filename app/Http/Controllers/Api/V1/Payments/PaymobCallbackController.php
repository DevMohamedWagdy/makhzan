<?php

namespace App\Http\Controllers\Api\V1\Payments;

use App\Actions\Payments\RecordPaymentResult;
use App\Enums\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Support\Payments\InvalidCallbackSignature;
use App\Support\Payments\PaymentGateways;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

/**
 * Where Paymob reports payments for a store: the server-to-server webhook ("transaction
 * processed callback") and the customer's browser coming back from the payment page
 * ("transaction response callback"). Both are signed with the store's HMAC secret and either
 * one is enough to settle the payment, since Paymob only sends the webhook on its own for cards.
 */
class PaymobCallbackController extends Controller
{
    public function __construct(private PaymentGateways $gateways, private RecordPaymentResult $recordResult) {}

    public function webhook(Request $request, Store $store): JsonResponse
    {
        $account = $store->paymentGateway ?? abort(Response::HTTP_NOT_FOUND);

        try {
            $transaction = $this->gateways->for($account)->parseCallback($request->json()->all(), $request->query('hmac'));
        } catch (InvalidCallbackSignature) {
            Log::warning('Rejected a Paymob webhook with a bad signature', ['store_id' => $store->id, 'ip' => $request->ip()]);

            abort(Response::HTTP_FORBIDDEN);
        }

        if ($transaction) {
            $this->recordResult->handle($store, $transaction);
        }

        return response()->json(['received' => true]);
    }

    /**
     * Records the result and sends the customer to their order (?payment=paid|failed|pending),
     * or to their orders list when the redirect can't be trusted.
     */
    public function return(Request $request, Store $store): RedirectResponse
    {
        $account = $store->paymentGateway;
        $payment = null;

        try {
            $transaction = $account ? $this->gateways->for($account)->parseCallback($request->query(), $request->query('hmac')) : null;
            $payment = $transaction ? $this->recordResult->handle($store, $transaction) : null;
        } catch (InvalidCallbackSignature) {
            Log::warning('Rejected a Paymob redirect with a bad signature', ['store_id' => $store->id, 'ip' => $request->ip()]);
        }

        if (! $payment) {
            return redirect()->away($store->storefrontUrl('/account/orders'));
        }

        $result = match (true) {
            $payment->status->isPaid() => 'paid',
            $payment->status === PaymentStatus::Failed => 'failed',
            default => 'pending',
        };

        return redirect()->away($store->storefrontUrl("/account/orders/{$payment->order->number}?payment={$result}"));
    }
}
