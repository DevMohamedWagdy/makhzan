<?php

namespace Tests\Feature\Api\V1\Vendor;

use App\Enums\CommissionStatus;
use App\Enums\OrderStatus;
use App\Models\Affiliate;
use App\Models\Order;
use App\Models\Product;
use App\Models\Vendor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderControllerTest extends TestCase
{
    use RefreshDatabase;

    private Vendor $vendor;

    protected function setUp(): void
    {
        parent::setUp();

        $this->vendor = $this->actingAsVendor();
    }

    private function order(array $attributes = []): Order
    {
        return Order::factory()->for($this->vendor->store)->create($attributes);
    }

    private function moveTo(Order $order, string $status, ?string $note = null)
    {
        return $this->patchJson("/api/v1/vendor/orders/{$order->id}/status", ['status' => $status, 'note' => $note]);
    }

    public function test_lists_filters_and_searches_the_stores_orders(): void
    {
        $pending = $this->order(['number' => 1001, 'recipient_name' => 'منى أحمد']);
        $shipped = $this->order(['number' => 1002, 'status' => OrderStatus::Shipped]);
        Order::factory()->create();

        $this->getJson('/api/v1/vendor/orders')->assertOk()->assertJsonPath('data.*.order_id', [$shipped->id, $pending->id]);
        $this->getJson('/api/v1/vendor/orders?status=shipped')->assertJsonPath('data.*.order_id', [$shipped->id]);
        $this->getJson('/api/v1/vendor/orders?search=%231001')->assertJsonPath('data.*.order_id', [$pending->id]);
        $this->getJson('/api/v1/vendor/orders?search='.urlencode('منى'))->assertJsonPath('data.*.order_id', [$pending->id]);

        $this->getJson('/api/v1/vendor/orders/summary')->assertOk()->assertJson(['pending' => 1, 'shipped' => 1, 'total' => 2]);
    }

    public function test_walks_an_order_to_delivery_and_credits_the_affiliate(): void
    {
        $affiliate = Affiliate::factory()->for($this->vendor)->for($this->vendor->store)->create(['orders_count' => 2, 'sales_total' => 1000, 'earned_commission' => 80, 'pending_balance' => 30]);
        $code = $affiliate->referralCodes()->first();
        $order = $this->order(['subtotal' => 900, 'affiliate_id' => $affiliate->id, 'referral_code_id' => $code->id, 'commission_amount' => 72, 'commission_status' => CommissionStatus::Pending]);

        $this->moveTo($order, 'confirmed')->assertOk()->assertJsonPath('data.status', 'confirmed')->assertJsonPath('data.next_statuses', ['shipped', 'cancelled']);
        $this->moveTo($order, 'shipped')->assertOk();
        $this->assertSame(80.0, $affiliate->fresh()->earned_commission);

        $this->moveTo($order, 'delivered')
            ->assertOk()
            ->assertJsonPath('data.commission.status', 'earned')
            ->assertJsonPath('data.events.*.status', ['confirmed', 'shipped', 'delivered']);

        $affiliate->refresh();
        $this->assertSame(3, $affiliate->orders_count);
        $this->assertSame(1900.0, $affiliate->sales_total);
        $this->assertSame(152.0, $affiliate->earned_commission);
        $this->assertSame(102.0, $affiliate->pending_balance);
        $this->assertSame(1, $code->fresh()->orders);
        $this->assertNotNull($order->fresh()->delivered_at);
    }

    public function test_a_returned_delivery_reverses_the_commission_and_restocks(): void
    {
        $variant = Product::factory()->for($this->vendor->store)->create()->variants()->first();
        $variant->update(['stock' => 4]);
        $affiliate = Affiliate::factory()->for($this->vendor)->for($this->vendor->store)->create(['earned_commission' => 50, 'pending_balance' => 50, 'orders_count' => 1, 'sales_total' => 500]);
        $order = $this->order(['status' => OrderStatus::Delivered, 'subtotal' => 500, 'affiliate_id' => $affiliate->id, 'commission_amount' => 50, 'commission_status' => CommissionStatus::Earned]);
        $order->items()->create(['product_variant_id' => $variant->id, 'product_name' => 'x', 'unit_price' => 250, 'quantity' => 2, 'line_total' => 500]);

        $this->moveTo($order, 'returned', 'المقاس غير مناسب')->assertOk()->assertJsonPath('data.commission.status', 'cancelled');

        $affiliate->refresh();
        $this->assertSame(0.0, $affiliate->earned_commission);
        $this->assertSame(0, $affiliate->orders_count);
        $this->assertSame(6, $variant->fresh()->stock);
    }

    public function test_cancelling_drops_a_pending_commission_without_touching_the_affiliate(): void
    {
        $affiliate = Affiliate::factory()->for($this->vendor)->for($this->vendor->store)->create(['earned_commission' => 0]);
        $order = $this->order(['affiliate_id' => $affiliate->id, 'commission_amount' => 40, 'commission_status' => CommissionStatus::Pending]);

        $this->moveTo($order, 'cancelled', 'العميل لا يرد')->assertOk()->assertJsonPath('data.cancel_reason', 'العميل لا يرد');

        $this->assertSame(CommissionStatus::Cancelled, $order->fresh()->commission_status);
        $this->assertSame(0.0, $affiliate->fresh()->earned_commission);
    }

    public function test_rejects_invalid_transitions(): void
    {
        $order = $this->order(['status' => OrderStatus::Pending]);

        $this->moveTo($order, 'delivered')->assertUnprocessable()->assertJsonValidationErrors(['status' => 'لا يمكن نقل الطلب إلى هذه الحالة']);
        $this->moveTo($this->order(['status' => OrderStatus::Cancelled]), 'confirmed')->assertUnprocessable();
    }

    public function test_shows_order_details_with_customer_and_commission(): void
    {
        $order = $this->order();

        $this->getJson("/api/v1/vendor/orders/{$order->id}")
            ->assertOk()
            ->assertJsonPath('data.customer.customer_id', $order->customer_id)
            ->assertJsonPath('data.commission.status', 'none');
    }

    public function test_returns_404_for_another_stores_order(): void
    {
        $foreign = Order::factory()->create();

        $this->getJson("/api/v1/vendor/orders/{$foreign->id}")->assertNotFound();
        $this->moveTo($foreign, 'confirmed')->assertNotFound();
        $this->assertSame(OrderStatus::Pending, $foreign->fresh()->status);
    }
}
