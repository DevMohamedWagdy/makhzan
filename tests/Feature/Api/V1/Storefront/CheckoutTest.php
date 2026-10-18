<?php

namespace Tests\Feature\Api\V1\Storefront;

use App\Actions\Orders\UpdateOrderStatus;
use App\Enums\CommissionStatus;
use App\Enums\CommissionType;
use App\Enums\OrderStatus;
use App\Models\Affiliate;
use App\Models\Customer;
use App\Models\CustomerAddress;
use App\Models\Order;
use App\Models\OrderEvent;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Store;
use App\Notifications\OrderCancelledByCustomerNotification;
use App\Notifications\OrderPlacedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CheckoutTest extends TestCase
{
    use RefreshDatabase;

    private const BASE = '/api/v1/storefront/noor-fashion';

    private Store $store;

    private Customer $customer;

    private ProductVariant $variant;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
        $this->store = Store::factory()->create(['slug' => 'noor-fashion', 'default_shipping_price' => 60]);
        $this->customer = Customer::factory()->for($this->store)->create(['phone' => '01055555555']);
        $this->variant = Product::factory()->for($this->store)->create(['name' => 'فستان'])->variants()->first();
        $this->variant->update(['price' => 400, 'stock' => 5, 'sku' => 'DR-1']);
        Sanctum::actingAs($this->customer, [Customer::TOKEN_ABILITY]);
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return [
            'items' => [['variant_id' => $this->variant->id, 'quantity' => 2]],
            'address' => ['recipient_name' => 'منى أحمد', 'phone' => '01012345678', 'governorate_id' => 'cairo', 'city_id' => 'maadi', 'address_line' => '5 شارع 9'],
            ...$overrides,
        ];
    }

    public function test_places_an_order_and_deducts_stock(): void
    {
        $this->postJson(self::BASE.'/customer/orders', $this->payload(['note' => 'اتصل قبل الوصول']))
            ->assertCreated()
            ->assertJsonPath('data.number', 1001)
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.subtotal', 800)
            ->assertJsonPath('data.shipping_fee', 60)
            ->assertJsonPath('data.total', 860)
            ->assertJsonPath('data.items.0.product_name', 'فستان')
            ->assertJsonPath('data.items.0.sku', 'DR-1')
            ->assertJsonPath('data.address.city_id', 'maadi')
            ->assertJsonMissingPath('data.commission')
            ->assertJsonPath('data.events.0.status', 'pending');

        $this->assertSame(3, $this->variant->fresh()->stock);
        $this->assertNotNull($this->customer->fresh()->last_order_at);
        Notification::assertSentTo($this->store->vendor, OrderPlacedNotification::class);

        $this->postJson(self::BASE.'/customer/orders', $this->payload(['items' => [['variant_id' => $this->variant->id, 'quantity' => 1]]]))->assertJsonPath('data.number', 1002);
    }

    public function test_rejects_items_beyond_the_stock_and_unavailable_items(): void
    {
        $draft = Product::factory()->for($this->store)->draft()->create()->variants()->first();

        $this->postJson(self::BASE.'/customer/orders', $this->payload(['items' => [
            ['variant_id' => $this->variant->id, 'quantity' => 6],
            ['variant_id' => $draft->id, 'quantity' => 1],
        ]]))->assertUnprocessable()->assertJsonValidationErrors([
            "items.{$this->variant->id}" => 'متبقي 5 قطعة فقط من هذا المنتج',
            "items.{$draft->id}" => 'هذا المنتج لم يعد متاحاً',
        ]);

        $this->assertSame(5, $this->variant->fresh()->stock);
        $this->assertSame(0, Order::count());
    }

    public function test_uses_governorate_rates_free_shipping_and_refuses_undelivered_governorates(): void
    {
        $this->store->shippingRates()->create(['governorate_id' => 'giza', 'price' => 45, 'is_enabled' => true]);
        $this->store->shippingRates()->create(['governorate_id' => 'aswan', 'is_enabled' => false]);
        $this->store->forceFill(['free_shipping_threshold' => 1000])->save();
        $this->variant->update(['stock' => 20]);

        $this->postJson(self::BASE.'/customer/orders', $this->payload(['address' => [...$this->payload()['address'], 'governorate_id' => 'giza', 'city_id' => 'dokki']]))
            ->assertJsonPath('data.shipping_fee', 45);

        $this->postJson(self::BASE.'/customer/orders', $this->payload(['items' => [['variant_id' => $this->variant->id, 'quantity' => 3]]]))
            ->assertJsonPath('data.shipping_fee', 0);

        $this->postJson(self::BASE.'/customer/orders', $this->payload(['address' => [...$this->payload()['address'], 'governorate_id' => 'aswan', 'city_id' => 'kom_ombo']]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['address.governorate_id' => 'المتجر لا يوصّل إلى هذه المحافظة حالياً']);

        $this->getJson(self::BASE.'/shipping')
            ->assertOk()
            ->assertJsonPath('free_shipping_threshold', 1000)
            ->assertJsonFragment(['governorate_id' => 'giza', 'price' => 45])
            ->assertJsonMissing(['governorate_id' => 'aswan']);
    }

    public function test_orders_to_a_saved_address_or_saves_the_new_one(): void
    {
        $saved = CustomerAddress::factory()->for($this->customer)->create(['governorate_id' => 'giza', 'city_id' => 'haram']);

        $this->postJson(self::BASE.'/customer/orders', ['items' => $this->payload()['items'], 'address_id' => $saved->id])
            ->assertCreated()
            ->assertJsonPath('data.address.city_id', 'haram');

        $this->postJson(self::BASE.'/customer/orders', $this->payload(['save_address' => true, 'items' => [['variant_id' => $this->variant->id, 'quantity' => 1]]]))->assertCreated();

        $this->assertSame(2, $this->customer->addresses()->count());

        $foreign = CustomerAddress::factory()->create();
        $this->postJson(self::BASE.'/customer/orders', ['items' => $this->payload()['items'], 'address_id' => $foreign->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('address_id');
    }

    public function test_credits_the_order_to_the_referring_affiliate(): void
    {
        $affiliate = Affiliate::factory()->for($this->store->vendor)->for($this->store)->withCustomCommission(CommissionType::Percentage, 10)->create();
        $code = $affiliate->referralCodes()->first();

        $orderId = $this->postJson(self::BASE.'/customer/orders', $this->payload(['referral_code' => strtolower($code->code)]))->assertCreated()->json('data.order_id');

        $order = Order::find($orderId);
        $this->assertTrue($order->affiliate->is($affiliate));
        $this->assertSame(CommissionStatus::Pending, $order->commission_status);
        $this->assertSame(80.0, $order->commission_amount);
        $this->assertSame(0.0, (float) $affiliate->fresh()->earned_commission - $affiliate->earned_commission);
    }

    public function test_ignores_self_referrals_and_disabled_codes(): void
    {
        $self = Affiliate::factory()->for($this->store->vendor)->for($this->store)->create(['phone' => '01055555555']);
        $frozen = Affiliate::factory()->for($this->store->vendor)->for($this->store)->frozen()->create();

        foreach ([$self, $frozen] as $affiliate) {
            $orderId = $this->postJson(self::BASE.'/customer/orders', $this->payload(['referral_code' => $affiliate->referralCodes()->first()->code, 'items' => [['variant_id' => $this->variant->id, 'quantity' => 1]]]))->json('data.order_id');

            $this->assertNull(Order::find($orderId)->affiliate_id);
        }
    }

    public function test_customers_cancel_pending_orders_and_stock_returns(): void
    {
        $number = $this->postJson(self::BASE.'/customer/orders', $this->payload())->json('data.number');

        $this->postJson(self::BASE."/customer/orders/{$number}/cancel", ['reason' => 'طلبت بالخطأ'])
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled')
            ->assertJsonPath('data.cancel_reason', 'طلبت بالخطأ');

        $this->assertSame(5, $this->variant->fresh()->stock);
        Notification::assertSentTo(
            $this->store->vendor,
            OrderCancelledByCustomerNotification::class,
            fn (OrderCancelledByCustomerNotification $notification): bool => $notification->order->number === $number && $notification->order->cancel_reason === 'طلبت بالخطأ',
        );
    }

    public function test_the_vendor_is_not_told_about_cancellations_they_made_themselves(): void
    {
        $order = Order::factory()->for($this->store)->for($this->customer)->create();

        app(UpdateOrderStatus::class)->handle($order, OrderStatus::Cancelled, OrderEvent::ACTOR_VENDOR, 'نفد المخزون');

        Notification::assertNotSentTo($this->store->vendor, OrderCancelledByCustomerNotification::class);
    }

    public function test_confirmed_orders_cannot_be_cancelled_by_the_customer(): void
    {
        $order = Order::factory()->for($this->store)->for($this->customer)->status(OrderStatus::Confirmed)->create(['number' => 1500]);

        $this->postJson(self::BASE.'/customer/orders/1500/cancel')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status' => 'لا يمكن إلغاء الطلب بعد تأكيده من المتجر، تواصل مع المتجر']);
        $this->assertSame(OrderStatus::Confirmed, $order->fresh()->status);
    }

    public function test_customers_only_see_their_own_orders(): void
    {
        Order::factory()->for($this->store)->for($this->customer)->create(['number' => 2001]);
        Order::factory()->for($this->store)->create(['number' => 2002]);

        $this->getJson(self::BASE.'/customer/orders')->assertOk()->assertJsonPath('data.*.number', [2001]);
        $this->getJson(self::BASE.'/customer/orders/2001')->assertOk();
        $this->getJson(self::BASE.'/customer/orders/2002')->assertNotFound();
    }

    public function test_guests_must_sign_in_to_check_out(): void
    {
        $this->app['auth']->forgetGuards();

        $this->postJson(self::BASE.'/customer/orders', $this->payload())->assertUnauthorized();
    }
}
