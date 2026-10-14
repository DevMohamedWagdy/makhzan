<?php

namespace App\Support\Shipping;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\StoreShippingAccount;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

/**
 * Bosta (Egypt) deliveries API, v2. Requests carry the store's raw API key in the
 * Authorization header; status updates come back to a per-order webhook with our secret
 * in the X-Bosta-Secret header.
 *
 * @see https://plugins.svn.wordpress.org/bosta-woocommerce/trunk/bosta-woocommerce.php Bosta's own integration
 */
class BostaClient
{
    /** Delivery type for a normal forward shipment. */
    private const TYPE_SEND = 10;

    public const STATE_DELIVERED = 45;

    public const STATE_RETURNED = 46;

    public function __construct(private StoreShippingAccount $account) {}

    /**
     * Checks the API key against the business info endpoint (what Bosta's own plugin uses).
     */
    public function verify(): bool
    {
        try {
            return $this->http('v0')->get('/businesses/'.rawurlencode((string) $this->account->credential('api_key')).'/info')->successful();
        } catch (ConnectionException) {
            return false;
        }
    }

    /**
     * Creates the delivery and returns Bosta's id, tracking number and initial state.
     *
     * @return array{id: string, tracking_number: string, status: string|null}
     */
    public function createDelivery(Order $order): array
    {
        $order->loadMissing(['items', 'store', 'customer']);
        $names = preg_split('/\s+/u', trim($order->recipient_name), 2) ?: [];
        $isCashOnDelivery = ! ($order->payment_method?->isOnline() && $order->payment_status?->isPaid());

        $response = $this->send(fn (PendingRequest $http): Response => $http->post('/deliveries?apiVersion=1', array_filter([
            'type' => self::TYPE_SEND,
            'businessReference' => 'MKZ-'.$order->store->slug.'-'.$order->number,
            'notes' => $order->customer_note ? mb_substr($order->customer_note, 0, 500) : null,
            'cod' => $isCashOnDelivery ? round($order->total, 2) : 0,
            'allowToOpenPackage' => (bool) $this->account->setting('allow_open_package', false),
            'specs' => ['packageDetails' => [
                'itemsCount' => (int) $order->items->sum('quantity'),
                'description' => mb_substr($order->items->map(fn (OrderItem $item): string => "{$item->product_name} × {$item->quantity}")->implode('، '), 0, 500),
            ]],
            'receiver' => array_filter([
                'firstName' => mb_substr($names[0] ?? $order->recipient_name, 0, 50),
                'lastName' => $names[1] ?? $names[0] ?? $order->recipient_name,
                'phone' => $order->phone,
                'email' => $order->customer?->email,
            ]),
            'dropOffAddress' => array_filter([
                'city' => config("makhzan.shipping.bosta_cities.{$order->governorate_id}"),
                'firstLine' => mb_substr($order->address_line, 0, 250),
                'secondLine' => $order->landmark ? mb_substr($order->landmark, 0, 250) : null,
            ]),
            'webhookUrl' => route('api.v1.shipping.bosta.webhook', ['store' => $order->store, 'order' => $order->id]),
            'webhookCustomHeaders' => ['X-Bosta-Secret' => $this->account->credential('webhook_secret')],
        ], fn ($value) => $value !== null)));

        $data = $response->json('data') ?? [];

        return [
            'id' => (string) ($data['_id'] ?? throw new ShippingException('Bosta returned no delivery id.')),
            'tracking_number' => (string) ($data['trackingNumber'] ?? ''),
            'status' => $data['state']['value'] ?? null,
        ];
    }

    /**
     * Airway bills for several deliveries as one PDF (binary).
     *
     * @param  list<string>  $deliveryIds
     */
    public function airwayBills(array $deliveryIds): string
    {
        $response = $this->send(fn (PendingRequest $http): Response => $http->get('/deliveries/mass-awb', ['ids' => implode(',', $deliveryIds), 'lang' => 'ar']));

        $pdf = base64_decode((string) $response->json('data'), true);

        return $pdf ?: throw new ShippingException('Bosta returned no airway bill.');
    }

    /**
     * Bosta's public tracking page for a shipment.
     */
    public static function trackingUrl(string $trackingNumber): string
    {
        return 'https://bosta.co/tracking-shipments?shipment-number='.rawurlencode($trackingNumber);
    }

    private function send(callable $request): Response
    {
        try {
            $response = $request($this->http());
        } catch (ConnectionException $exception) {
            throw new ShippingException('Bosta is unreachable: '.$exception->getMessage(), previous: $exception);
        }

        if (! $response->successful() || $response->json('success') === false) {
            throw new ShippingException($response->json('message') ?? "Bosta responded {$response->status()}.");
        }

        return $response;
    }

    private function http(string $version = 'v2'): PendingRequest
    {
        return Http::baseUrl(rtrim((string) config('services.bosta.base_url'), '/')."/api/{$version}")
            ->withHeaders(['Authorization' => (string) $this->account->credential('api_key'), 'X-Requested-By' => 'Makhzan'])
            ->acceptJson()
            ->asJson()
            ->timeout(30);
    }
}
