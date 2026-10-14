<?php

namespace Tests\Feature\Api\V1\Storefront;

use App\Actions\Orders\UpdateOrderStatus;
use App\Enums\OrderStatus;
use App\Enums\TrackingProvider;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderEvent;
use App\Models\Plan;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ConversionTrackingTest extends TestCase
{
    use RefreshDatabase;

    private const BASE = '/api/v1/storefront/noor-fashion';

    private Store $store;

    private ProductVariant $variant;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();

        $this->store = Store::factory()->create(['slug' => 'noor-fashion', 'default_shipping_price' => 60]);
        $this->variant = Product::factory()->for($this->store)->create(['name' => 'فستان'])->variants()->first();
        $this->variant->update(['price' => 400, 'stock' => 5]);
        Sanctum::actingAs(Customer::factory()->for($this->store)->create(['email' => 'Mona@Example.com']), [Customer::TOKEN_ABILITY]);
    }

    private function fakePlatforms(): void
    {
        Http::fake([
            'graph.facebook.com/*' => Http::response(['events_received' => 1]),
            'business-api.tiktok.com/*' => Http::response(['code' => 0, 'message' => 'OK']),
            'www.google-analytics.com/*' => Http::response(null, 204),
        ]);
    }

    private function connect(TrackingProvider $provider, string $pixelId, ?string $token = 'server-token'): void
    {
        $this->store->trackingPixels()->create(['provider' => $provider, 'pixel_id' => $pixelId, 'access_token' => $token]);
    }

    private function placeOrder(): Order
    {
        $this->postJson(self::BASE.'/customer/orders', [
            'items' => [['variant_id' => $this->variant->id, 'quantity' => 2]],
            'address' => ['recipient_name' => 'منى أحمد', 'phone' => '01012345678', 'governorate_id' => 'cairo', 'city_id' => 'maadi', 'address_line' => '5 شارع 9'],
            'tracking' => ['fbp' => 'fb.1.1700000000.111', 'fbc' => 'fb.1.1700000000.AbC', 'ttclid' => 'tt-click', 'ga_client_id' => '1234.5678', 'page_url' => 'https://noor.test/checkout'],
        ], ['User-Agent' => 'TestBrowser/1.0'])->assertCreated();

        return Order::query()->latest('id')->firstOrFail();
    }

    public function test_a_cash_on_delivery_order_is_sent_to_every_connected_platform(): void
    {
        $this->fakePlatforms();
        $this->connect(TrackingProvider::Meta, '123456789012345');
        $this->connect(TrackingProvider::Tiktok, 'C5ABCDEFGHIJKLMNOP12');
        $this->connect(TrackingProvider::Google, 'G-AB12CD34EF', 'ga-secret');

        $order = $this->placeOrder();

        $this->assertSame('TestBrowser/1.0', $order->tracking['user_agent']);
        $this->assertSame('fb.1.1700000000.111', $order->tracking['fbp']);

        Http::assertSent(function (Request $request) use ($order): bool {
            $event = $request['data'][0] ?? [];

            return str_contains($request->url(), 'graph.facebook.com/v21.0/123456789012345/events')
                && $request['access_token'] === 'server-token'
                && $event['event_name'] === 'Purchase'
                && $event['event_id'] === "order-{$order->id}"
                && $event['user_data']['ph'] === [hash('sha256', '201012345678')]
                && $event['user_data']['em'] === [hash('sha256', 'mona@example.com')]
                && $event['user_data']['fbp'] === 'fb.1.1700000000.111'
                && $event['user_data']['client_user_agent'] === 'TestBrowser/1.0'
                && $event['custom_data']['value'] === 860.0
                && $event['custom_data']['contents'][0]['quantity'] === 2;
        });

        Http::assertSent(fn (Request $request): bool => str_contains($request->url(), 'business-api.tiktok.com')
            && $request->header('Access-Token')[0] === 'server-token'
            && $request['event_source_id'] === 'C5ABCDEFGHIJKLMNOP12'
            && $request['data'][0]['event'] === 'CompletePayment'
            && $request['data'][0]['event_id'] === "order-{$order->id}"
            && $request['data'][0]['user']['ttclid'] === 'tt-click');

        Http::assertSent(fn (Request $request): bool => str_contains($request->url(), 'google-analytics.com/mp/collect')
            && str_contains($request->url(), 'measurement_id=G-AB12CD34EF')
            && $request['client_id'] === '1234.5678'
            && $request['events'][0]['name'] === 'purchase'
            && $request['events'][0]['params']['transaction_id'] === (string) $order->number);

        $this->assertNotNull($this->store->trackingPixels()->where('provider', 'meta')->sole()->last_sent_at);
    }

    public function test_delivered_orders_are_reported_to_meta_and_google_but_not_tiktok(): void
    {
        $this->connect(TrackingProvider::Meta, '123456789012345');
        $this->connect(TrackingProvider::Tiktok, 'C5ABCDEFGHIJKLMNOP12');
        $this->fakePlatforms();
        $order = $this->placeOrder();
        Http::assertSentCount(2);
        Http::fake(fn () => Http::response(['events_received' => 1, 'code' => 0]));

        $updateStatus = app(UpdateOrderStatus::class);
        foreach ([OrderStatus::Confirmed, OrderStatus::Shipped, OrderStatus::Delivered] as $status) {
            $updateStatus->handle($order, $status, OrderEvent::ACTOR_VENDOR);
        }

        Http::assertSentCount(1);
        Http::assertSent(fn (Request $request): bool => $request['data'][0]['event_name'] === 'OrderDelivered' && $request['data'][0]['event_id'] === "order-{$order->id}-delivered");
    }

    public function test_a_refusal_is_recorded_on_the_pixel_without_failing_the_order(): void
    {
        Http::fake(['graph.facebook.com/*' => Http::response(['error' => ['message' => 'Invalid OAuth access token.']], 400)]);
        $this->connect(TrackingProvider::Meta, '123456789012345');

        $this->placeOrder();

        $pixel = $this->store->trackingPixels()->sole();
        $this->assertStringContainsString('Invalid OAuth access token.', $pixel->last_error);
        $this->assertNotNull($pixel->last_error_at);
        $this->assertNull($pixel->last_sent_at);
    }

    public function test_nothing_is_sent_without_a_token_or_on_a_plan_without_server_side_tracking(): void
    {
        $this->fakePlatforms();
        $this->connect(TrackingProvider::Meta, '123456789012345', token: null);
        $this->placeOrder();

        $this->store->forceFill(['plan_id' => Plan::factory()->create(['features' => []])->id, 'plan_expires_at' => now()->addMonth(), 'trial_ends_at' => now()->subDay()])->save();
        $this->store->trackingPixels()->sole()->update(['access_token' => 'token']);
        $this->placeOrder();

        Http::assertNothingSent();
    }
}
