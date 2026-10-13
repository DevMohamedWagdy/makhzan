<?php

namespace Tests\Feature\Api\V1\Vendor;

use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Store;
use App\Models\Vendor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaymentTransactionsTest extends TestCase
{
    use RefreshDatabase;

    private const URL = '/api/v1/vendor/payment-transactions';

    private Vendor $vendor;

    private Store $store;

    protected function setUp(): void
    {
        parent::setUp();

        $this->travelTo('2026-10-13 12:00:00');
        $this->vendor = $this->actingAsVendor();
        $this->store = $this->vendor->store;
    }

    private function order(array $attributes = [], PaymentStatus $status = PaymentStatus::Paid, PaymentMethod $method = PaymentMethod::Card): Order
    {
        return Order::factory()->for($this->store)->online($status, $method)->create(['total' => 500, ...$attributes]);
    }

    private function refund(Payment $payment, float $amount, string $at, ?string $reason = null): void
    {
        $payment->refunds()->create(['order_id' => $payment->order_id, 'amount' => $amount, 'reason' => $reason, 'gateway_reference' => '555', 'actor' => 'vendor'])
            ->forceFill(['created_at' => $at])
            ->save();
    }

    public function test_lists_payment_attempts_and_refunds_newest_first(): void
    {
        $order = $this->order(['number' => 1001, 'recipient_name' => 'منى أحمد']);
        $failed = Payment::factory()->for($order)->create(['status' => PaymentStatus::Failed, 'failure_reason' => 'Insufficient funds', 'created_at' => '2026-10-12 09:00:00']);
        $paid = Payment::factory()->for($order)->paid()->create([
            'gateway_transaction_id' => '192036465',
            'payload' => ['source_data' => ['pan' => '512345xxxxxx2346', 'sub_type' => 'MasterCard', 'type' => 'card']],
            'created_at' => '2026-10-12 09:05:00',
        ]);
        $this->refund($paid, 120, '2026-10-12 15:00:00', 'قطعة تالفة');

        $this->getJson(self::URL)
            ->assertOk()
            ->assertJsonPath('meta.total', 3)
            ->assertJsonPath('data.0.kind', 'refund')
            ->assertJsonPath('data.0.amount', 120)
            ->assertJsonPath('data.0.note', 'قطعة تالفة')
            ->assertJsonPath('data.0.method', 'card')
            ->assertJsonPath('data.1.id', "payment-{$paid->id}")
            ->assertJsonPath('data.1.status', 'paid')
            ->assertJsonPath('data.1.order_number', 1001)
            ->assertJsonPath('data.1.customer_name', 'منى أحمد')
            ->assertJsonPath('data.1.transaction_id', '192036465')
            ->assertJsonPath('data.1.source', ['last4' => '2346', 'brand' => 'MasterCard'])
            ->assertJsonPath('data.2.id', "payment-{$failed->id}")
            ->assertJsonPath('data.2.note', 'Insufficient funds')
            ->assertJsonPath('data.2.source', null);
    }

    public function test_filters_by_kind_status_method_period_and_search(): void
    {
        $card = Payment::factory()->for($this->order(['number' => 1001]))->paid()->create(['gateway_transaction_id' => '111', 'status' => PaymentStatus::PartiallyRefunded, 'created_at' => '2026-10-10 10:00:00']);
        $this->refund($card, 50, '2026-10-11 10:00:00');
        $wallet = Payment::factory()->for($this->order(['number' => 1002], method: PaymentMethod::Wallet))->create(['method' => PaymentMethod::Wallet, 'status' => PaymentStatus::Failed, 'created_at' => '2026-10-12 10:00:00']);

        $ids = fn (string $query): array => array_column($this->getJson(self::URL.'?'.$query)->assertOk()->json('data'), 'id');

        $this->assertSame(["payment-{$card->id}"], $ids('status=paid'));
        $this->assertSame(["payment-{$wallet->id}"], $ids('method=wallet'));
        $this->assertSame(['refund-1'], $ids('kind=refund'));
        $this->assertSame(['refund-1', "payment-{$card->id}"], $ids('from=2026-10-10&to=2026-10-11'));
        $this->assertSame(["payment-{$wallet->id}"], $ids('search=%231002'));
        $this->assertSame(["payment-{$card->id}"], $ids('search=111'));

        $this->getJson(self::URL.'?status=refunded&kind=all')->assertUnprocessable()->assertJsonValidationErrors(['status', 'kind']);
    }

    public function test_summarizes_the_period_and_what_needs_attention(): void
    {
        Payment::factory()->for($this->order())->paid()->create(['amount' => 500, 'paid_at' => '2026-10-12 10:00:00']);
        $refunded = Payment::factory()->for($this->order())->paid()->create(['amount' => 500, 'status' => PaymentStatus::PartiallyRefunded, 'paid_at' => '2026-10-12 11:00:00']);
        $this->refund($refunded, 200, '2026-10-12 12:00:00');
        $this->refund($refunded, 99, '2026-09-01 12:00:00');
        Payment::factory()->for($this->order())->paid()->create(['amount' => 500, 'paid_at' => '2026-09-01 10:00:00']);
        Payment::factory()->for($this->order([], PaymentStatus::Failed))->create(['status' => PaymentStatus::Failed, 'created_at' => '2026-10-12 13:00:00']);
        $this->order(['total' => 300], PaymentStatus::Pending);
        $late = $this->order(['status' => OrderStatus::Cancelled, 'total' => 450]);

        $this->getJson(self::URL.'/summary?from=2026-10-01&to=2026-10-13')
            ->assertOk()
            ->assertJson([
                'collected' => 1000,
                'refunded' => 200,
                'net' => 800,
                'successful' => 2,
                'failed' => 1,
                'awaiting' => ['count' => 2, 'amount' => 800],
                'to_refund' => ['count' => 1, 'amount' => 450, 'order_id' => $late->id],
            ]);
    }

    public function test_exports_the_filtered_list(): void
    {
        Payment::factory()->for($this->order())->paid()->create();
        Payment::factory()->for($this->order())->create(['status' => PaymentStatus::Failed]);

        $this->getJson(self::URL.'/export?status=failed')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.status', 'failed');
    }

    public function test_only_shows_the_vendors_own_store(): void
    {
        $foreign = Payment::factory()->for(Order::factory()->online()->create())->paid()->create();
        $this->refund($foreign, 10, '2026-10-12 12:00:00');

        $this->getJson(self::URL)->assertOk()->assertJsonPath('meta.total', 0);
        $this->getJson(self::URL.'/summary')->assertJsonPath('connected', false)->assertJsonPath('collected', 0)->assertJsonPath('refunded', 0);
    }
}
