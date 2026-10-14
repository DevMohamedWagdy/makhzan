<?php

namespace Tests\Feature\Api\V1\Storefront;

use App\Actions\Orders\UpdateOrderStatus;
use App\Enums\LoyaltyTransactionType;
use App\Enums\OrderStatus;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderEvent;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LoyaltyTest extends TestCase
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
        $this->store->forceFill(['loyalty_enabled' => true, 'loyalty_earn_rate' => 10, 'loyalty_point_value' => 0.25, 'loyalty_min_redeem' => 100])->save();
        $this->customer = Customer::factory()->for($this->store)->create();
        $this->variant = Product::factory()->for($this->store)->create()->variants()->first();
        $this->variant->update(['price' => 500, 'stock' => 10]);
        Sanctum::actingAs($this->customer, [Customer::TOKEN_ABILITY]);
    }

    private function placeOrder(array $overrides = []): Order
    {
        $this->postJson(self::BASE.'/customer/orders', [
            'items' => [['variant_id' => $this->variant->id, 'quantity' => 2]],
            'address' => ['recipient_name' => 'منى أحمد', 'phone' => '01012345678', 'governorate_id' => 'cairo', 'city_id' => 'maadi', 'address_line' => '5 شارع 9'],
            ...$overrides,
        ])->assertCreated();

        return Order::query()->latest('id')->firstOrFail();
    }

    private function moveTo(Order $order, OrderStatus ...$statuses): Order
    {
        foreach ($statuses as $status) {
            $order = app(UpdateOrderStatus::class)->handle($order, $status, OrderEvent::ACTOR_VENDOR);
        }

        return $order;
    }

    public function test_a_delivered_order_earns_points_on_what_the_customer_paid_for_products(): void
    {
        $order = $this->placeOrder();
        $this->assertSame(0, $this->customer->fresh()->points_balance);

        $this->moveTo($order, OrderStatus::Confirmed, OrderStatus::Shipped, OrderStatus::Delivered);

        $this->assertSame(100, $order->fresh()->points_earned);
        $this->assertSame(100, $this->customer->refresh()->points_balance);
        $this->getJson(self::BASE.'/customer/points')
            ->assertOk()
            ->assertJsonPath('summary.enabled', true)
            ->assertJsonPath('summary.balance', 100)
            ->assertJsonPath('summary.balance_value', 25)
            ->assertJsonPath('data.0.type', 'earned')
            ->assertJsonPath('data.0.points', 100)
            ->assertJsonPath('data.0.order_number', $order->number);
    }

    public function test_points_come_off_the_order_total_and_the_balance(): void
    {
        $this->customer->forceFill(['points_balance' => 500])->save();

        $order = $this->placeOrder(['redeem_points' => 200]);

        $this->assertSame(200, $order->points_redeemed);
        $this->assertSame(50.0, $order->points_discount);
        $this->assertSame(1010.0, $order->total);
        $this->assertSame(300, $this->customer->fresh()->points_balance);
        $this->assertDatabaseHas('loyalty_transactions', ['order_id' => $order->id, 'type' => 'redeemed', 'points' => -200, 'balance_after' => 300]);

        $this->moveTo($order, OrderStatus::Confirmed, OrderStatus::Shipped, OrderStatus::Delivered);
        $this->assertSame(95, $order->fresh()->points_earned);
    }

    public function test_points_never_take_the_products_below_zero(): void
    {
        $this->customer->forceFill(['points_balance' => 10000])->save();

        $order = $this->placeOrder(['redeem_points' => 10000]);

        $this->assertSame(4000, $order->points_redeemed);
        $this->assertSame(1000.0, $order->points_discount);
        $this->assertSame(60.0, $order->total);
        $this->assertSame(6000, $this->customer->fresh()->points_balance);
    }

    public function test_rejects_spending_too_few_too_many_or_unavailable_points(): void
    {
        $this->customer->forceFill(['points_balance' => 150])->save();
        $orders = fn (): array => ['items' => [['variant_id' => $this->variant->id, 'quantity' => 1]], 'address' => ['recipient_name' => 'منى', 'phone' => '01012345678', 'governorate_id' => 'cairo', 'city_id' => 'maadi', 'address_line' => '5 شارع 9']];

        $this->postJson(self::BASE.'/customer/orders', [...$orders(), 'redeem_points' => 50])->assertJsonValidationErrors(['redeem_points' => __('loyalty.min_redeem', ['min' => 100])]);
        $this->postJson(self::BASE.'/customer/orders', [...$orders(), 'redeem_points' => 200])->assertJsonValidationErrors(['redeem_points' => __('loyalty.insufficient', ['balance' => 150])]);

        $this->store->forceFill(['loyalty_enabled' => false])->save();
        $this->postJson(self::BASE.'/customer/orders', [...$orders(), 'redeem_points' => 100])->assertJsonValidationErrors(['redeem_points' => __('loyalty.unavailable')]);

        $this->assertSame(0, Order::count());
        $this->assertSame(10, $this->variant->fresh()->stock);
    }

    public function test_a_cancelled_order_gives_its_points_back(): void
    {
        $this->customer->forceFill(['points_balance' => 300])->save();
        $order = $this->placeOrder(['redeem_points' => 300]);

        $this->moveTo($order, OrderStatus::Cancelled);

        $this->assertSame(300, $this->customer->fresh()->points_balance);
        $this->assertDatabaseHas('loyalty_transactions', ['order_id' => $order->id, 'type' => 'refunded', 'points' => 300]);
    }

    public function test_a_returned_order_refunds_spent_points_and_takes_back_earned_ones(): void
    {
        $this->customer->forceFill(['points_balance' => 200])->save();
        $order = $this->placeOrder(['redeem_points' => 200]);
        $this->moveTo($order, OrderStatus::Confirmed, OrderStatus::Shipped, OrderStatus::Delivered);
        $this->assertSame(95, $this->customer->fresh()->points_balance);

        $this->moveTo($order->fresh(), OrderStatus::Returned);

        $this->assertSame(200, $this->customer->fresh()->points_balance);
        $this->assertSame(
            [LoyaltyTransactionType::Redeemed, LoyaltyTransactionType::Earned, LoyaltyTransactionType::Refunded, LoyaltyTransactionType::Reversed],
            $this->customer->loyaltyTransactions()->orderBy('id')->pluck('type')->all(),
        );
    }

    public function test_nothing_is_earned_while_the_program_is_off(): void
    {
        $this->store->forceFill(['loyalty_enabled' => false])->save();
        $order = $this->placeOrder();

        $this->moveTo($order, OrderStatus::Confirmed, OrderStatus::Shipped, OrderStatus::Delivered);

        $this->assertSame(0, $this->customer->fresh()->points_balance);
        $this->getJson(self::BASE)->assertJsonPath('store.loyalty', null);
    }

    public function test_the_storefront_describes_the_program(): void
    {
        $this->getJson(self::BASE)->assertJsonPath('store.loyalty', ['earn_rate' => 10, 'point_value' => 0.25, 'min_redeem' => 100]);
        $this->getJson(self::BASE.'/customer/me')->assertJsonPath('data.points_balance', 0);
    }
}
