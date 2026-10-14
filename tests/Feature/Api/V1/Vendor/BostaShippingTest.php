<?php

namespace Tests\Feature\Api\V1\Vendor;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\StoreShippingAccount;
use App\Models\Vendor;
use App\Notifications\CustomerOrderUpdateNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class BostaShippingTest extends TestCase
{
    use RefreshDatabase;

    private const DELIVERIES_URL = 'https://app.bosta.co/api/v2/deliveries*';

    private Vendor $vendor;

    protected function setUp(): void
    {
        parent::setUp();

        Http::preventStrayRequests();
        Notification::fake();
        $this->vendor = $this->actingAsVendor();
    }

    private function connect(): StoreShippingAccount
    {
        return StoreShippingAccount::factory()->for($this->vendor->store)->create();
    }

    private function confirmedOrder(array $attributes = []): Order
    {
        $order = Order::factory()->for($this->vendor->store)->status(OrderStatus::Confirmed)->create(['recipient_name' => 'منى أحمد علي', 'phone' => '01012345678', 'governorate_id' => 'giza', 'total' => 860, ...$attributes]);
        OrderItem::factory()->for($order)->create(['product_name' => 'فستان', 'quantity' => 2]);

        return $order;
    }

    public function test_connecting_checks_the_api_key_with_bosta(): void
    {
        Http::fake(['https://app.bosta.co/api/v0/businesses/*' => Http::sequence()->push([], 401)->push(['success' => true, 'data' => ['name' => 'Noor']])]);

        $this->putJson('/api/v1/vendor/shipping/bosta', ['api_key' => 'wrong'])->assertJsonValidationErrors('api_key');
        $this->putJson('/api/v1/vendor/shipping/bosta', ['api_key' => 'live_key_1234', 'allow_open_package' => true])
            ->assertOk()
            ->assertJsonPath('data.connected', true)
            ->assertJsonPath('data.api_key_hint', '••••1234')
            ->assertJsonPath('data.allow_open_package', true);

        $account = $this->vendor->store->bostaAccount()->first();
        $this->assertSame('live_key_1234', $account->credential('api_key'));
        $this->assertNotNull($account->credential('webhook_secret'));
        Http::assertSent(fn (Request $request): bool => $request->hasHeader('Authorization', 'live_key_1234'));
    }

    public function test_ships_a_confirmed_order_with_bosta_and_emails_the_tracking_number(): void
    {
        $this->connect();
        $order = $this->confirmedOrder();
        Http::fake([self::DELIVERIES_URL => Http::response(['success' => true, 'data' => ['_id' => 'dlv_1', 'trackingNumber' => '7234567', 'state' => ['value' => 'Pickup requested']]])]);

        $this->postJson("/api/v1/vendor/orders/{$order->id}/shipment")
            ->assertOk()
            ->assertJsonPath('data.status', 'shipped')
            ->assertJsonPath('data.shipment.tracking_number', '7234567')
            ->assertJsonPath('data.shipment.is_bosta', true);

        Http::assertSent(function (Request $request) use ($order): bool {
            return $request->hasHeader('Authorization', 'bosta_test_key')
                && $request['cod'] == 860
                && $request['dropOffAddress']['city'] === 'Giza'
                && $request['receiver']['firstName'] === 'منى'
                && $request['specs']['packageDetails']['itemsCount'] === 2
                && $request['webhookCustomHeaders']['X-Bosta-Secret'] === 'bosta-webhook-secret'
                && str_ends_with($request['webhookUrl'], "/orders/{$order->id}/webhook");
        });
        Notification::assertSentTo($order->customer, CustomerOrderUpdateNotification::class, fn (CustomerOrderUpdateNotification $notification): bool => in_array('رقم التتبع لدى بوسطة: 7234567', $notification->toMail($order->customer)->introLines, true));
    }

    public function test_paid_online_orders_are_shipped_without_cash_to_collect(): void
    {
        $this->connect();
        $order = Order::factory()->for($this->vendor->store)->online()->status(OrderStatus::Confirmed)->create();
        Http::fake([self::DELIVERIES_URL => Http::response(['success' => true, 'data' => ['_id' => 'dlv_2', 'trackingNumber' => '99']])]);

        $this->postJson("/api/v1/vendor/orders/{$order->id}/shipment")->assertOk();

        Http::assertSent(fn (Request $request): bool => $request['cod'] === 0);
    }

    public function test_refuses_to_ship_without_a_connection_or_before_confirming(): void
    {
        $order = $this->confirmedOrder();
        $this->postJson("/api/v1/vendor/orders/{$order->id}/shipment")->assertJsonValidationErrors('carrier');

        $this->connect();
        $pending = $this->confirmedOrder(['status' => OrderStatus::Pending]);
        $this->postJson("/api/v1/vendor/orders/{$pending->id}/shipment")->assertJsonValidationErrors('status');
    }

    public function test_a_bosta_rejection_is_reported_and_the_order_stays_confirmed(): void
    {
        $this->connect();
        $order = $this->confirmedOrder();
        Http::fake([self::DELIVERIES_URL => Http::response(['success' => false, 'message' => 'Invalid city'], 400)]);

        $this->postJson("/api/v1/vendor/orders/{$order->id}/shipment")->assertJsonValidationErrors('carrier');

        $this->assertSame(OrderStatus::Confirmed, $order->fresh()->status);
        $this->assertNull($order->fresh()->tracking_number);
    }

    public function test_webhook_updates_move_the_order_to_delivered(): void
    {
        $this->connect();
        $order = $this->confirmedOrder(['status' => OrderStatus::Shipped, 'carrier' => 'bosta', 'carrier_shipment_id' => 'dlv_1', 'tracking_number' => '7234567']);
        $url = "/api/v1/shipping/bosta/{$this->vendor->store->slug}/orders/{$order->id}/webhook";

        $this->postJson($url, ['state' => 45, 'description' => 'Delivered'])->assertUnauthorized();
        $this->postJson($url, ['state' => 41, 'description' => 'Out for delivery'], ['X-Bosta-Secret' => 'bosta-webhook-secret'])->assertOk();
        $this->assertSame('Out for delivery', $order->fresh()->carrier_status);
        $this->assertSame(OrderStatus::Shipped, $order->fresh()->status);

        $this->postJson($url, ['state' => 45, 'description' => 'Delivered'], ['X-Bosta-Secret' => 'bosta-webhook-secret'])->assertOk();
        $this->assertSame(OrderStatus::Delivered, $order->fresh()->status);

        // Repeated updates are harmless.
        $this->postJson($url, ['state' => 45], ['X-Bosta-Secret' => 'bosta-webhook-secret'])->assertOk();
    }

    public function test_vendors_record_other_companies_tracking_numbers(): void
    {
        $order = $this->confirmedOrder(['status' => OrderStatus::Shipped]);

        $this->putJson("/api/v1/vendor/orders/{$order->id}/tracking", ['carrier' => 'أرامكس', 'tracking_number' => 'AX-55'])
            ->assertOk()
            ->assertJsonPath('data.shipment.carrier', 'أرامكس')
            ->assertJsonPath('data.shipment.tracking_url', null);
    }

    public function test_prints_bosta_airway_bills_for_the_selected_orders(): void
    {
        $this->connect();
        $order = $this->confirmedOrder(['status' => OrderStatus::Shipped, 'carrier' => 'bosta', 'carrier_shipment_id' => 'dlv_1', 'tracking_number' => '7234567']);
        Http::fake(['https://app.bosta.co/api/v2/deliveries/mass-awb*' => Http::response(['success' => true, 'data' => base64_encode('%PDF-1.4 test')])]);

        $this->get('/api/v1/vendor/orders/airway-bills?'.http_build_query(['ids' => [$order->id]]))
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf');

        Http::assertSent(fn (Request $request): bool => str_contains($request->url(), 'ids=dlv_1'));
    }
}
