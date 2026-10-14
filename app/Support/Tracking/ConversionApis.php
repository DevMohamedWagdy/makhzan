<?php

namespace App\Support\Tracking;

use App\Enums\TrackingProvider;
use App\Models\StoreTrackingPixel;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

/**
 * Sends order events from the server to Meta's Conversions API, TikTok's Events API and
 * Google Analytics 4's Measurement Protocol. Personal data is SHA-256 hashed as each platform
 * requires; nothing is sent in clear text except the IP and user agent, which they need for
 * matching.
 */
class ConversionApis
{
    public const META_API_VERSION = 'v21.0';

    /**
     * Whether the platform takes this event from the server. TikTok only gets purchases.
     */
    public function supports(TrackingProvider $provider, string $event): bool
    {
        return $event === ConversionEvent::PURCHASE || $provider !== TrackingProvider::Tiktok;
    }

    /**
     * @throws ConversionFailed
     */
    public function send(StoreTrackingPixel $pixel, ConversionEvent $event): void
    {
        try {
            $response = match ($pixel->provider) {
                TrackingProvider::Meta => $this->meta($pixel, $event),
                TrackingProvider::Tiktok => $this->tiktok($pixel, $event),
                TrackingProvider::Google => $this->google($pixel, $event),
            };
        } catch (ConnectionException $exception) {
            throw new ConversionFailed(__('tracking.unreachable'), previous: $exception);
        }

        $this->ensureAccepted($pixel->provider, $response);
    }

    private function meta(StoreTrackingPixel $pixel, ConversionEvent $event): Response
    {
        $userData = array_filter([
            'ph' => array_filter([ConversionEvent::hash($event->phone)]),
            'em' => array_filter([ConversionEvent::hash($event->email)]),
            'external_id' => array_filter([ConversionEvent::hash($event->externalId)]),
            'country' => [ConversionEvent::hash('eg')],
            'client_ip_address' => $event->browser('ip'),
            'client_user_agent' => $event->browser('user_agent'),
            'fbp' => $event->browser('fbp'),
            'fbc' => $event->browser('fbc'),
        ]);

        return $this->http()->post('https://graph.facebook.com/'.self::META_API_VERSION."/{$pixel->pixel_id}/events", array_filter([
            'access_token' => $pixel->access_token,
            'test_event_code' => $pixel->test_event_code,
            'data' => [[
                'event_name' => $event->name === ConversionEvent::PURCHASE ? 'Purchase' : 'OrderDelivered',
                'event_time' => $event->occurredAt->getTimestamp(),
                'event_id' => $event->eventId,
                'action_source' => 'website',
                'event_source_url' => $event->browser('page_url'),
                'user_data' => $userData,
                'custom_data' => [
                    'currency' => $event->currency,
                    'value' => $event->value,
                    'order_id' => $event->orderNumber,
                    'content_type' => 'product',
                    'content_ids' => array_column($event->items, 'id'),
                    'contents' => array_map(fn (array $item): array => ['id' => $item['id'], 'quantity' => $item['quantity'], 'item_price' => $item['price']], $event->items),
                    'num_items' => array_sum(array_column($event->items, 'quantity')),
                ],
            ]],
        ]));
    }

    private function tiktok(StoreTrackingPixel $pixel, ConversionEvent $event): Response
    {
        return $this->http()
            ->withHeaders(['Access-Token' => $pixel->access_token])
            ->post('https://business-api.tiktok.com/open_api/v1.3/event/track/', array_filter([
                'event_source' => 'web',
                'event_source_id' => $pixel->pixel_id,
                'test_event_code' => $pixel->test_event_code,
                'data' => [[
                    'event' => 'CompletePayment',
                    'event_time' => $event->occurredAt->getTimestamp(),
                    'event_id' => $event->eventId,
                    'user' => array_filter([
                        'phone' => ConversionEvent::hash($event->phone ? '+'.$event->phone : null),
                        'email' => ConversionEvent::hash($event->email),
                        'external_id' => ConversionEvent::hash($event->externalId),
                        'ip' => $event->browser('ip'),
                        'user_agent' => $event->browser('user_agent'),
                        'ttp' => $event->browser('ttp'),
                        'ttclid' => $event->browser('ttclid'),
                    ]),
                    'page' => array_filter(['url' => $event->browser('page_url')]),
                    'properties' => [
                        'currency' => $event->currency,
                        'value' => $event->value,
                        'order_id' => $event->orderNumber,
                        'content_type' => 'product',
                        'contents' => array_map(fn (array $item): array => ['content_id' => $item['id'], 'content_name' => $item['name'], 'quantity' => $item['quantity'], 'price' => $item['price']], $event->items),
                    ],
                ]],
            ]));
    }

    /**
     * GA4 ties server events to a visitor through the `_ga` cookie's client ID; orders placed
     * without one are attributed to the customer instead.
     */
    private function google(StoreTrackingPixel $pixel, ConversionEvent $event): Response
    {
        return $this->http()
            ->withQueryParameters(['measurement_id' => $pixel->pixel_id, 'api_secret' => $pixel->access_token])
            ->post('https://www.google-analytics.com/mp/collect', [
                'client_id' => $event->browser('ga_client_id') ?? 'customer.'.($event->externalId ?? $event->orderNumber),
                'timestamp_micros' => $event->occurredAt->getTimestamp() * 1_000_000,
                'events' => [[
                    'name' => $event->name === ConversionEvent::PURCHASE ? 'purchase' : 'order_delivered',
                    'params' => [
                        'transaction_id' => $event->orderNumber,
                        'currency' => $event->currency,
                        'value' => $event->value,
                        'shipping' => $event->shipping,
                        'items' => array_map(fn (array $item): array => ['item_id' => $item['id'], 'item_name' => $item['name'], 'quantity' => $item['quantity'], 'price' => $item['price']], $event->items),
                    ],
                ]],
            ]);
    }

    private function http(): PendingRequest
    {
        return Http::acceptJson()->asJson()->timeout(10)->connectTimeout(5);
    }

    /**
     * @throws ConversionFailed
     */
    private function ensureAccepted(TrackingProvider $provider, Response $response): void
    {
        $message = match (true) {
            $response->failed() => $response->json('error.message') ?? $response->json('message') ?? "HTTP {$response->status()}",
            $provider === TrackingProvider::Tiktok && (int) $response->json('code', 0) !== 0 => $response->json('message') ?? 'TikTok error',
            default => null,
        };

        if ($message !== null) {
            throw new ConversionFailed(__('tracking.rejected', ['provider' => __("tracking.providers.{$provider->value}"), 'message' => $message]));
        }
    }
}
