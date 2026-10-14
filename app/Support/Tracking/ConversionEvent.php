<?php

namespace App\Support\Tracking;

use App\Models\Order;
use App\Models\OrderItem;
use App\Support\PhoneNumber;
use Carbon\CarbonImmutable;

/**
 * One order event as the ad platforms want it: what was bought and for how much, plus the
 * shopper's identifiers (hashed by each client) and the browser cookies captured at checkout,
 * which let the platform match the order to the ad click. The event ID equals the one the
 * storefront's pixel uses, so platforms count a purchase seen by both only once.
 */
final readonly class ConversionEvent
{
    public const PURCHASE = 'purchase';

    /** The order reached the customer: lets ad platforms optimise for orders that weren't refused. */
    public const DELIVERED = 'delivered';

    /**
     * @param  list<array{id: string, name: string, quantity: int, price: float}>  $items
     * @param  array{fbp?: string|null, fbc?: string|null, ttp?: string|null, ttclid?: string|null, ga_client_id?: string|null, ip?: string|null, user_agent?: string|null, page_url?: string|null}  $browser
     */
    public function __construct(
        public string $name,
        public string $eventId,
        public CarbonImmutable $occurredAt,
        public string $orderNumber,
        public float $value,
        public float $shipping,
        public string $currency,
        public array $items,
        public ?string $phone,
        public ?string $email,
        public ?string $externalId,
        public array $browser,
    ) {}

    public static function fromOrder(Order $order, string $name): self
    {
        $order->loadMissing(['items', 'customer']);

        return new self(
            name: $name,
            eventId: self::eventIdFor($order, $name),
            occurredAt: CarbonImmutable::instance(($name === self::DELIVERED ? $order->delivered_at : ($order->paid_at ?? $order->created_at)) ?? now()),
            orderNumber: (string) $order->number,
            value: (float) $order->total,
            shipping: (float) $order->shipping_fee,
            currency: 'EGP',
            items: $order->items->map(fn (OrderItem $item): array => [
                'id' => (string) ($item->product_id ?? $item->sku ?? $item->id),
                'name' => $item->product_name,
                'quantity' => $item->quantity,
                'price' => (float) $item->unit_price,
            ])->values()->all(),
            phone: self::internationalPhone($order->phone),
            email: $order->customer?->email ? mb_strtolower(trim($order->customer->email)) : null,
            externalId: $order->customer_id ? "{$order->store_id}-{$order->customer_id}" : null,
            browser: $order->tracking ?? [],
        );
    }

    /**
     * Shared with the storefront pixel ("order-{id}") so a purchase seen by the browser and
     * the server is counted once.
     */
    public static function eventIdFor(Order $order, string $name): string
    {
        return $name === self::PURCHASE ? "order-{$order->id}" : "order-{$order->id}-{$name}";
    }

    /**
     * Digits with the country code and no "+", the format the platforms hash: 01012345678 → 201012345678.
     */
    public static function internationalPhone(?string $phone): ?string
    {
        $phone = PhoneNumber::normalize($phone);

        return match (true) {
            $phone === '' => null,
            str_starts_with($phone, '+') => substr($phone, 1),
            str_starts_with($phone, '01') => '2'.$phone,
            str_starts_with($phone, '05') => '966'.substr($phone, 1),
            default => $phone,
        };
    }

    public static function hash(?string $value): ?string
    {
        return $value === null || $value === '' ? null : hash('sha256', mb_strtolower(trim($value)));
    }

    public function browser(string $key): ?string
    {
        $value = $this->browser[$key] ?? null;

        return is_string($value) && $value !== '' ? $value : null;
    }
}
