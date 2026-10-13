<?php

namespace App\Support\Payments;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Order;
use App\Models\Payment;
use App\Models\StorePaymentGateway;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

/**
 * Paymob (Egypt) through its Intention API and Unified Checkout. Callbacks are signed with
 * HMAC-SHA512 over a fixed list of transaction fields, keyed with the account's HMAC secret.
 *
 * @see https://developers.paymob.com/paymob-docs/developers/intention-apis/create-intention
 * @see https://developers.paymob.com/paymob-docs/developers/webhook-callbacks-and-hmac/hmac/hmac-transaction-callback
 */
class PaymobGateway implements PaymentGateway
{
    /** Transaction fields signed by the callback HMAC, in order. */
    private const HMAC_FIELDS = [
        'amount_cents', 'created_at', 'currency', 'error_occured', 'has_parent_transaction', 'id', 'integration_id',
        'is_3d_secure', 'is_auth', 'is_capture', 'is_refunded', 'is_standalone_payment', 'is_voided', 'order.id',
        'owner', 'pending', 'source_data.pan', 'source_data.sub_type', 'source_data.type', 'success',
    ];

    public function __construct(private StorePaymentGateway $account) {}

    public function startCheckout(Payment $payment, Order $order): CheckoutSession
    {
        $order->loadMissing(['customer', 'store.vendor']);
        $integrationId = $this->account->integrationIdFor($payment->method)
            ?? throw new PaymentGatewayException("No Paymob integration for [{$payment->method->value}].");

        $response = $this->send(fn (PendingRequest $http): Response => $http->post('/v1/intention/', [
            'amount' => $this->cents($payment->amount),
            'currency' => 'EGP',
            'payment_methods' => [(int) $integrationId],
            'items' => [[
                'name' => __('payments.paymob_item', ['number' => $order->number]),
                'amount' => $this->cents($payment->amount),
                'quantity' => 1,
            ]],
            'billing_data' => $this->billingData($order),
            'special_reference' => $payment->reference,
            'notification_url' => route('api.v1.payments.paymob.webhook', $order->store),
            'redirection_url' => route('api.v1.payments.paymob.return', $order->store),
        ]));

        $clientSecret = $response->json('client_secret') ?? throw new PaymentGatewayException('Paymob returned no client secret.');

        return new CheckoutSession(
            url: $this->baseUrl().'/unifiedcheckout/?'.http_build_query(['publicKey' => $this->account->credential('public_key'), 'clientSecret' => $clientSecret]),
            intentionId: (string) $response->json('id'),
            gatewayOrderId: $response->json('intention_order_id') !== null ? (string) $response->json('intention_order_id') : null,
        );
    }

    /**
     * Accepts both shapes Paymob sends: the webhook's JSON ({type, obj: {...}}) and the
     * redirect's flat query string, where PHP has turned "source_data.pan" into "source_data_pan".
     */
    public function parseCallback(array $data, ?string $signature): ?GatewayTransaction
    {
        if (isset($data['obj'])) {
            if (($data['type'] ?? null) !== 'TRANSACTION') {
                return null;
            }

            $transaction = $data['obj'];
            $orderId = Arr::get($transaction, 'order.id');
            $reference = Arr::get($transaction, 'order.merchant_order_id');
            $message = Arr::get($transaction, 'data.message');
        } else {
            $transaction = $data;
            $orderId = $data['order'] ?? $data['order_id'] ?? null;
            $reference = $data['merchant_order_id'] ?? null;
            $message = $data['data_message'] ?? $data['data.message'] ?? null;
        }

        $field = fn (string $key): mixed => match ($key) {
            'order.id' => $orderId,
            default => Arr::get($transaction, $key) ?? $transaction[str_replace('.', '_', $key)] ?? null,
        };

        $expected = hash_hmac('sha512', implode('', array_map(fn (string $key): string => $this->stringify($field($key)), self::HMAC_FIELDS)), (string) $this->account->credential('hmac_secret'));

        if (! is_string($signature) || ! hash_equals($expected, strtolower($signature))) {
            throw new InvalidCallbackSignature('Paymob callback signature mismatch.');
        }

        // Refunds and voids arrive as child transactions; they're recorded when we make them.
        if ($this->isTrue($field('has_parent_transaction')) || $this->isTrue($field('is_refunded')) || $this->isTrue($field('is_voided'))) {
            return null;
        }

        $status = match (true) {
            $this->isTrue($field('pending')) => PaymentStatus::Pending,
            $this->isTrue($field('success')) => PaymentStatus::Paid,
            default => PaymentStatus::Failed,
        };

        return new GatewayTransaction(
            status: $status,
            reference: filled($reference) ? (string) $reference : null,
            gatewayOrderId: filled($orderId) ? (string) $orderId : null,
            transactionId: filled($field('id')) ? (string) $field('id') : null,
            amount: round(((int) $field('amount_cents')) / 100, 2),
            failureReason: $status === PaymentStatus::Failed && filled($message) ? mb_substr((string) $message, 0, 255) : null,
            payload: $transaction,
        );
    }

    public function refund(Payment $payment, float $amount): string
    {
        $response = $this->send(fn (PendingRequest $http): Response => $http->post('/api/acceptance/void_refund/refund', [
            'transaction_id' => (int) $payment->gateway_transaction_id,
            'amount_cents' => $this->cents($amount),
        ]));

        if ($response->json('success') !== true) {
            throw new PaymentGatewayException((string) ($response->json('data.message') ?? 'Paymob refused the refund.'));
        }

        return (string) $response->json('id');
    }

    /**
     * Opens a small test intention with each integration id: a wrong secret key is refused
     * outright, a wrong (or test/live mismatched) integration id with a 404.
     */
    public function verify(): void
    {
        foreach ($this->account->methods() as $method) {
            $field = $method === PaymentMethod::Card ? 'paymob.card_integration_id' : 'paymob.wallet_integration_id';

            try {
                $response = $this->http()->post('/v1/intention/', [
                    'amount' => 1000,
                    'currency' => 'EGP',
                    'payment_methods' => [(int) $this->account->integrationIdFor($method)],
                    'items' => [['name' => 'Makhzan connection check', 'amount' => 1000, 'quantity' => 1]],
                    'billing_data' => ['first_name' => 'Makhzan', 'last_name' => 'Check', 'phone_number' => '+201000000000', 'email' => 'check@makhzan.app'],
                ]);
            } catch (ConnectionException) {
                throw ValidationException::withMessages(['paymob' => __('payments.paymob_unreachable')]);
            }

            if ($response->status() === 401 || $response->status() === 403) {
                throw ValidationException::withMessages(['paymob.secret_key' => __('payments.paymob_secret_invalid')]);
            }

            if (! $response->successful()) {
                throw ValidationException::withMessages([$field => __('payments.paymob_integration_invalid')]);
            }
        }
    }

    /**
     * @param  callable(PendingRequest): Response  $request
     *
     * @throws PaymentGatewayException
     */
    private function send(callable $request): Response
    {
        try {
            $response = $request($this->http());
        } catch (ConnectionException $exception) {
            throw new PaymentGatewayException('Paymob is unreachable: '.$exception->getMessage(), previous: $exception);
        }

        if (! $response->successful()) {
            throw new PaymentGatewayException("Paymob responded {$response->status()}: ".mb_substr($response->body(), 0, 500));
        }

        return $response;
    }

    private function http(): PendingRequest
    {
        return Http::baseUrl($this->baseUrl())
            ->withHeaders(['Authorization' => 'Token '.$this->account->credential('secret_key')])
            ->acceptJson()
            ->asJson()
            ->timeout(20);
    }

    private function baseUrl(): string
    {
        return rtrim((string) config('services.paymob.base_url'), '/');
    }

    /**
     * Paymob requires these billing fields; "NA" fills the ones we don't collect.
     *
     * @return array<string, string>
     */
    private function billingData(Order $order): array
    {
        $names = preg_split('/\s+/u', trim($order->recipient_name), 2) ?: [];

        return [
            'first_name' => $names[0] ?? 'NA',
            'last_name' => $names[1] ?? $names[0] ?? 'NA',
            'phone_number' => '+2'.$order->phone,
            'email' => $order->customer?->email ?: ($order->store->contact_email ?: $order->store->vendor->email),
            'street' => mb_substr($order->address_line, 0, 100),
            'building' => 'NA',
            'floor' => 'NA',
            'apartment' => 'NA',
            'city' => $order->city_id,
            'state' => $order->governorate_id,
            'country' => 'EG',
        ];
    }

    private function cents(float $amount): int
    {
        return (int) round($amount * 100);
    }

    private function stringify(mixed $value): string
    {
        return match (true) {
            is_bool($value) => $value ? 'true' : 'false',
            $value === null => '',
            default => (string) $value,
        };
    }

    private function isTrue(mixed $value): bool
    {
        return $value === true || $value === 'true';
    }
}
