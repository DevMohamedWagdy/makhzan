<?php

namespace Tests\Feature\Api\V1\Vendor;

use App\Enums\CommissionStatus;
use App\Enums\CommissionType;
use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Models\Affiliate;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Store;
use App\Models\StorePaymentGateway;
use App\Models\Vendor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class OrderRefundTest extends TestCase
{
    use RefreshDatabase;

    private const REFUND_URL = 'https://accept.paymob.com/api/acceptance/void_refund/refund';

    private Vendor $vendor;

    private Store $store;

    private Order $order;

    private Payment $payment;

    protected function setUp(): void
    {
        parent::setUp();

        Http::preventStrayRequests();
        $this->vendor = $this->actingAsVendor();
        $this->store = $this->vendor->store;
        StorePaymentGateway::factory()->for($this->store)->create();
        // Products 1000, shipping 50.
        $this->order = Order::factory()->for($this->store)->online()->status(OrderStatus::Delivered)->create(['subtotal' => 1000, 'shipping_fee' => 50, 'total' => 1050]);
        $this->payment = Payment::factory()->for($this->order)->paid()->create(['gateway_transaction_id' => '192036465']);
    }

    private function url(?Order $order = null): string
    {
        return '/api/v1/vendor/orders/'.($order ?? $this->order)->id.'/refunds';
    }

    public function test_refunds_part_then_the_rest_of_a_payment(): void
    {
        Http::fake([self::REFUND_URL => Http::response(['id' => 555, 'success' => true])]);

        $this->postJson($this->url(), ['amount' => 300, 'reason' => 'قطعة تالفة'])
            ->assertOk()
            ->assertJsonPath('data.payment_status', 'partially_refunded')
            ->assertJsonPath('data.refunded_amount', 300)
            ->assertJsonPath('data.payment.refundable', 750)
            ->assertJsonPath('data.payment.refunds.0.reason', 'قطعة تالفة');

        Http::assertSent(fn (Request $request): bool => $request['transaction_id'] === 192036465 && $request['amount_cents'] === 30000
            && $request->header('Authorization')[0] === 'Token '.$this->store->paymentGateway->credential('secret_key'));

        $this->postJson($this->url(), ['amount' => 750])
            ->assertOk()
            ->assertJsonPath('data.payment_status', 'refunded')
            ->assertJsonPath('data.payment.refundable', 0);

        $this->assertSame(PaymentStatus::Refunded, $this->payment->fresh()->status);
        $this->assertSame(2, $this->order->refunds()->count());
    }

    public function test_refuses_more_than_was_paid_and_orders_without_an_online_payment(): void
    {
        $this->postJson($this->url(), ['amount' => 1050.01])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['amount' => 'أقصى مبلغ يمكن استرداده 1,050.00 ج.م']);

        $this->postJson($this->url(), ['amount' => 0])->assertJsonValidationErrors(['amount' => 'أدخل المبلغ المراد استرداده']);

        $cod = Order::factory()->for($this->store)->create();
        $this->postJson($this->url($cod), ['amount' => 10])->assertJsonValidationErrors(['amount' => 'لا يوجد مبلغ مدفوع أونلاين يمكن استرداده لهذا الطلب']);

        Http::assertNothingSent();
    }

    public function test_reports_a_refund_paymob_refuses_and_records_nothing(): void
    {
        Http::fake([self::REFUND_URL => Http::response(['success' => false, 'data' => ['message' => 'Transaction not refundable']])]);

        $this->postJson($this->url(), ['amount' => 100])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['amount' => 'رفضت Paymob الاسترداد، راجع حسابك على Paymob وحاول مرة أخرى']);

        $this->assertSame(0.0, $this->order->fresh()->refunded_amount);
        $this->assertSame(PaymentStatus::Paid, $this->payment->fresh()->status);
    }

    public function test_shrinks_an_earned_percentage_commission_with_the_refunded_products(): void
    {
        Http::fake([self::REFUND_URL => Http::response(['id' => 555, 'success' => true])]);
        $affiliate = Affiliate::factory()->for($this->vendor)->for($this->store)->create(['earned_commission' => 100, 'pending_balance' => 100]);
        $this->order->update(['affiliate_id' => $affiliate->id, 'commission_type' => CommissionType::Percentage, 'commission_rate' => 10, 'commission_amount' => 100, 'commission_status' => CommissionStatus::Earned]);

        $this->postJson($this->url(), ['amount' => 400])->assertOk()->assertJsonPath('data.commission.amount', 60);

        $affiliate->refresh();
        $this->assertSame(60.0, (float) $affiliate->earned_commission);
        $this->assertSame(60.0, (float) $affiliate->pending_balance);
    }

    public function test_another_stores_order_is_not_found(): void
    {
        $foreign = Order::factory()->online()->create();

        $this->postJson($this->url($foreign), ['amount' => 10])->assertNotFound();
    }
}
