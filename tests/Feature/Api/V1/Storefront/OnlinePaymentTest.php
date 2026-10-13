<?php

namespace Tests\Feature\Api\V1\Storefront;

use App\Enums\CommissionType;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Affiliate;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Store;
use App\Models\StorePaymentGateway;
use App\Notifications\AffiliateCommissionNotification;
use App\Notifications\LatePaymentNotification;
use App\Notifications\OrderPlacedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OnlinePaymentTest extends TestCase
{
    use RefreshDatabase;

    private const BASE = '/api/v1/storefront/noor-fashion';

    private const INTENTION_URL = 'https://accept.paymob.com/v1/intention/';

    private Store $store;

    private StorePaymentGateway $paymob;

    private Customer $customer;

    private ProductVariant $variant;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
        Http::preventStrayRequests();
        $this->store = Store::factory()->create(['slug' => 'noor-fashion', 'default_shipping_price' => 60]);
        $this->paymob = StorePaymentGateway::factory()->for($this->store)->create();
        $this->customer = Customer::factory()->for($this->store)->create(['phone' => '01055555555', 'email' => 'mona@example.com']);
        $this->variant = Product::factory()->for($this->store)->create()->variants()->first();
        $this->variant->update(['price' => 400, 'stock' => 5]);
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
            'payment_method' => 'card',
            ...$overrides,
        ];
    }

    private function fakeIntention(): void
    {
        Http::fake([self::INTENTION_URL => Http::response(['id' => 'pi_test_1', 'client_secret' => 'egy_csk_test_abc', 'intention_order_id' => 217503754], 201)]);
    }

    private function placeCardOrder(): Order
    {
        $this->fakeIntention();
        $this->postJson(self::BASE.'/customer/orders', $this->payload())->assertCreated();

        return Order::query()->latest('id')->first();
    }

    /**
     * A Paymob "transaction processed" callback body for the payment, as documented.
     *
     * @return array<string, mixed>
     */
    private function transaction(Payment $payment, array $overrides = []): array
    {
        return [
            'id' => 192036465,
            'amount_cents' => (int) round($payment->amount * 100),
            'created_at' => '2026-10-13T11:33:44.592345',
            'currency' => 'EGP',
            'error_occured' => false,
            'has_parent_transaction' => false,
            'integration_id' => 4097558,
            'is_3d_secure' => true,
            'is_auth' => false,
            'is_capture' => false,
            'is_refunded' => false,
            'is_standalone_payment' => true,
            'is_voided' => false,
            'order' => ['id' => (int) $payment->gateway_order_id, 'merchant_order_id' => $payment->reference],
            'owner' => 302852,
            'pending' => false,
            'source_data' => ['pan' => '2346', 'type' => 'card', 'sub_type' => 'MasterCard'],
            'success' => true,
            ...$overrides,
        ];
    }

    /**
     * HMAC-SHA512 over Paymob's documented field order, keyed with the store's HMAC secret.
     */
    private function sign(array $transaction): string
    {
        $value = fn (mixed $field): string => is_bool($field) ? ($field ? 'true' : 'false') : (string) $field;
        $fields = [
            $transaction['amount_cents'], $transaction['created_at'], $transaction['currency'], $transaction['error_occured'],
            $transaction['has_parent_transaction'], $transaction['id'], $transaction['integration_id'], $transaction['is_3d_secure'],
            $transaction['is_auth'], $transaction['is_capture'], $transaction['is_refunded'], $transaction['is_standalone_payment'],
            $transaction['is_voided'], $transaction['order']['id'], $transaction['owner'], $transaction['pending'],
            $transaction['source_data']['pan'], $transaction['source_data']['sub_type'], $transaction['source_data']['type'], $transaction['success'],
        ];

        return hash_hmac('sha512', implode('', array_map($value, $fields)), $this->paymob->credential('hmac_secret'));
    }

    private function webhook(array $transaction, ?string $hmac = null): TestResponse
    {
        return $this->postJson('/api/v1/payments/paymob/noor-fashion/webhook?hmac='.($hmac ?? $this->sign($transaction)), ['type' => 'TRANSACTION', 'obj' => $transaction]);
    }

    public function test_signature_matches_paymobs_documented_example(): void
    {
        $this->paymob->update(['credentials' => [...$this->paymob->credentials, 'hmac_secret' => 'documented-secret']]);
        $payment = Payment::factory()->for(Order::factory()->for($this->store)->online(PaymentStatus::Pending)->create(['total' => 1000]))->create(['gateway_order_id' => '217503754']);
        $transaction = $this->transaction($payment, ['created_at' => '2024-06-13T11:33:44.592345']);
        $documented = '1000002024-06-13T11:33:44.592345EGPfalsefalse1920364654097558truefalsefalsefalsetruefalse217503754302852false2346MasterCardcardtrue';

        $this->webhook($transaction, hash_hmac('sha512', $documented, 'documented-secret'))->assertOk();

        $this->assertSame(PaymentStatus::Paid, $payment->fresh()->status);
    }

    public function test_card_checkout_holds_the_stock_and_returns_the_payment_page(): void
    {
        $this->fakeIntention();

        $this->postJson(self::BASE.'/customer/orders', $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.payment_method', 'card')
            ->assertJsonPath('data.payment.status', 'pending')
            ->assertJsonPath('data.payment.can_pay', true)
            ->assertJsonPath('data.payment.checkout_url', 'https://accept.paymob.com/unifiedcheckout/?publicKey='.$this->paymob->credential('public_key').'&clientSecret=egy_csk_test_abc');

        $payment = Payment::query()->sole();
        $this->assertSame(3, $this->variant->fresh()->stock);
        $this->assertSame('217503754', $payment->gateway_order_id);
        Http::assertSent(fn (Request $request): bool => $request->url() === self::INTENTION_URL
            && $request->header('Authorization')[0] === 'Token '.$this->paymob->credential('secret_key')
            && $request['amount'] === 86000
            && $request['payment_methods'] === [4097558]
            && $request['special_reference'] === $payment->reference
            && $request['billing_data']['phone_number'] === '+201012345678'
            && $request['billing_data']['email'] === 'mona@example.com'
            && $request['notification_url'] === route('api.v1.payments.paymob.webhook', $this->store)
            && $request['redirection_url'] === route('api.v1.payments.paymob.return', $this->store));
        // Nobody hears about the order until it's paid.
        Notification::assertNothingSent();
    }

    public function test_rejects_payment_methods_the_store_doesnt_offer(): void
    {
        $this->paymob->update(['credentials' => [...$this->paymob->credentials, 'wallet_integration_id' => null]]);

        $this->postJson(self::BASE.'/customer/orders', $this->payload(['payment_method' => 'wallet']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['payment_method' => 'طريقة الدفع هذه غير متاحة في المتجر حالياً']);

        $this->store->update(['cod_enabled' => false]);
        $this->postJson(self::BASE.'/customer/orders', $this->payload(['payment_method' => 'cod']))->assertJsonValidationErrors('payment_method');
        $this->postJson(self::BASE.'/customer/orders', $this->payload(['payment_method' => 'bitcoin']))->assertJsonValidationErrors('payment_method');

        $this->assertSame(0, Order::count());
        $this->assertSame(5, $this->variant->fresh()->stock);
        $this->getJson(self::BASE)->assertJsonPath('store.payment_methods', ['card']);
    }

    public function test_drops_the_order_when_the_payment_page_cant_be_opened(): void
    {
        Http::fake([self::INTENTION_URL => Http::response(['detail' => 'Integration not found'], 404)]);

        $this->postJson(self::BASE.'/customer/orders', $this->payload())
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['payment_method' => 'تعذر فتح صفحة الدفع، حاول مرة أخرى أو اختر الدفع عند الاستلام']);

        $this->assertSame(OrderStatus::Cancelled, Order::query()->sole()->status);
        $this->assertSame(5, $this->variant->fresh()->stock);
        $this->assertSame(PaymentStatus::Failed, Payment::query()->sole()->status);
    }

    public function test_a_paid_webhook_settles_the_order_once_and_announces_it(): void
    {
        $affiliate = Affiliate::factory()->for($this->store->vendor)->for($this->store)->withCustomCommission(CommissionType::Percentage, 10)->create();
        $this->fakeIntention();
        $this->postJson(self::BASE.'/customer/orders', $this->payload(['referral_code' => $affiliate->referralCodes()->first()->code]))->assertCreated();
        $payment = Payment::query()->sole();

        $this->webhook($this->transaction($payment))->assertOk();
        $this->webhook($this->transaction($payment))->assertOk();

        $order = $payment->order->fresh();
        $this->assertSame(PaymentStatus::Paid, $order->payment_status);
        $this->assertNotNull($order->paid_at);
        $this->assertSame('192036465', $payment->fresh()->gateway_transaction_id);
        Notification::assertSentToTimes($this->store->vendor, OrderPlacedNotification::class, 1);
        Notification::assertSentToTimes($affiliate, AffiliateCommissionNotification::class, 1);
    }

    public function test_rejects_callbacks_with_a_bad_signature(): void
    {
        $order = $this->placeCardOrder();
        $transaction = $this->transaction($order->payments()->sole());

        $this->webhook($transaction, str_repeat('0', 128))->assertForbidden();
        $this->webhook([...$transaction, 'amount_cents' => 100], $this->sign($transaction))->assertForbidden();
        $this->postJson('/api/v1/payments/paymob/noor-fashion/webhook', ['type' => 'TRANSACTION', 'obj' => $transaction])->assertForbidden();

        $this->assertSame(PaymentStatus::Pending, $order->fresh()->payment_status);
    }

    public function test_ignores_refund_callbacks_and_unknown_payments(): void
    {
        $order = $this->placeCardOrder();
        $payment = $order->payments()->sole();

        $this->webhook($this->transaction($payment, ['is_refunded' => true, 'has_parent_transaction' => true]))->assertOk();
        $this->webhook($this->transaction($payment, ['order' => ['id' => 1, 'merchant_order_id' => 'someone-else']]))->assertOk();

        $this->assertSame(PaymentStatus::Pending, $order->fresh()->payment_status);
    }

    public function test_a_declined_card_can_be_retried_with_a_new_payment_page(): void
    {
        Http::fake([self::INTENTION_URL => Http::sequence()
            ->push(['id' => 'pi_test_1', 'client_secret' => 'egy_csk_test_abc', 'intention_order_id' => 217503754], 201)
            ->push(['id' => 'pi_test_2', 'client_secret' => 'egy_csk_test_retry', 'intention_order_id' => 217503999], 201)]);
        $this->postJson(self::BASE.'/customer/orders', $this->payload())->assertCreated();
        $order = Order::query()->sole();
        $payment = $order->payments()->sole();

        $this->webhook($this->transaction($payment, ['success' => false, 'data' => ['message' => 'Insufficient funds']]))->assertOk();

        $this->assertSame(PaymentStatus::Failed, $order->fresh()->payment_status);
        $this->getJson(self::BASE."/customer/orders/{$order->number}")
            ->assertJsonPath('data.payment.status', 'failed')
            ->assertJsonPath('data.payment.failure_reason', 'Insufficient funds')
            ->assertJsonPath('data.payment.can_pay', true)
            ->assertJsonPath('data.payment.checkout_url', null);

        $this->postJson(self::BASE."/customer/orders/{$order->number}/pay")
            ->assertOk()
            ->assertJsonPath('data.payment.checkout_url', fn (string $url): bool => str_ends_with($url, 'clientSecret=egy_csk_test_retry'));

        $this->assertSame(2, $order->payments()->count());
    }

    public function test_paid_cod_and_other_customers_orders_cant_be_paid(): void
    {
        $order = $this->placeCardOrder();
        $this->webhook($this->transaction($order->payments()->sole()));
        $cod = Order::factory()->for($this->store)->for($this->customer)->create(['number' => 2001]);
        $foreign = Order::factory()->for($this->store)->online(PaymentStatus::Pending)->create(['number' => 2002]);

        $this->postJson(self::BASE."/customer/orders/{$order->number}/pay")->assertJsonValidationErrors(['payment_method' => 'لا يمكن دفع هذا الطلب الآن']);
        $this->postJson(self::BASE.'/customer/orders/2001/pay')->assertJsonValidationErrors('payment_method');
        $this->postJson(self::BASE.'/customer/orders/2002/pay')->assertNotFound();

        $this->assertSame(0, $cod->payments()->count() + $foreign->payments()->count());
    }

    public function test_the_return_redirect_settles_the_payment_and_shows_the_order(): void
    {
        $order = $this->placeCardOrder();
        $transaction = $this->transaction($order->payments()->sole());
        $query = [
            ...collect($transaction)->except(['order', 'source_data'])->map(fn ($value) => is_bool($value) ? ($value ? 'true' : 'false') : $value)->all(),
            'order' => $transaction['order']['id'],
            'merchant_order_id' => $transaction['order']['merchant_order_id'],
            'source_data.pan' => '2346',
            'source_data.type' => 'card',
            'source_data.sub_type' => 'MasterCard',
            'hmac' => $this->sign($transaction),
        ];

        $this->get('/api/v1/payments/paymob/noor-fashion/return?'.http_build_query($query))
            ->assertRedirect("https://makhzan.app/noor-fashion/account/orders/{$order->number}?payment=paid");

        $this->assertSame(PaymentStatus::Paid, $order->fresh()->payment_status);

        $this->get('/api/v1/payments/paymob/noor-fashion/return?'.http_build_query([...$query, 'hmac' => 'forged']))
            ->assertRedirect('https://makhzan.app/noor-fashion/account/orders');
    }

    public function test_the_store_cant_confirm_an_order_before_its_paid(): void
    {
        $order = $this->placeCardOrder();
        $this->actingAsVendor($this->store->vendor);

        $this->getJson("/api/v1/vendor/orders/{$order->id}")->assertJsonPath('data.next_statuses', ['cancelled']);
        $this->patchJson("/api/v1/vendor/orders/{$order->id}/status", ['status' => 'confirmed'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status' => 'لا يمكن تأكيد الطلب قبل أن يدفعه العميل']);

        $this->webhook($this->transaction($order->payments()->sole()));

        $this->patchJson("/api/v1/vendor/orders/{$order->id}/status", ['status' => 'confirmed'])->assertOk()->assertJsonPath('data.status', 'confirmed');
    }

    public function test_unpaid_orders_expire_and_release_their_stock(): void
    {
        $affiliate = Affiliate::factory()->for($this->store->vendor)->for($this->store)->create();
        $this->fakeIntention();
        $this->postJson(self::BASE.'/customer/orders', $this->payload(['referral_code' => $affiliate->referralCodes()->first()->code]))->assertCreated();
        $unpaid = Order::query()->sole();
        $paid = Order::factory()->for($this->store)->online(PaymentStatus::Paid)->create(['payment_expires_at' => now()->subMinute()]);
        $cod = Order::factory()->for($this->store)->create();

        $this->travel(29)->minutes();
        $this->artisan('makhzan:expire-unpaid-orders')->assertSuccessful();
        $this->assertSame(OrderStatus::Pending, $unpaid->fresh()->status);

        $this->travel(2)->minutes();
        $this->artisan('makhzan:expire-unpaid-orders')->expectsOutput('Cancelled 1 unpaid order(s).')->assertSuccessful();

        $this->assertSame(OrderStatus::Cancelled, $unpaid->fresh()->status);
        $this->assertSame('لم يكتمل الدفع في الوقت المحدد', $unpaid->fresh()->cancel_reason);
        $this->assertSame(5, $this->variant->fresh()->stock);
        $this->assertSame(OrderStatus::Pending, $paid->fresh()->status);
        $this->assertSame(OrderStatus::Pending, $cod->fresh()->status);
        // The affiliate never heard of the order, so isn't told it was dropped either.
        Notification::assertNotSentTo($affiliate, AffiliateCommissionNotification::class);
    }

    public function test_a_payment_after_cancellation_asks_the_vendor_to_refund(): void
    {
        $order = $this->placeCardOrder();
        $this->postJson(self::BASE."/customer/orders/{$order->number}/cancel")->assertOk();

        $this->webhook($this->transaction($order->payments()->sole()))->assertOk();

        $this->assertSame(PaymentStatus::Paid, $order->fresh()->payment_status);
        Notification::assertSentTo($this->store->vendor, LatePaymentNotification::class);
        Notification::assertNotSentTo($this->store->vendor, OrderPlacedNotification::class);
    }

    public function test_cash_on_delivery_still_works_without_a_payment(): void
    {
        $this->postJson(self::BASE.'/customer/orders', $this->payload(['payment_method' => null]))
            ->assertCreated()
            ->assertJsonPath('data.payment_method', PaymentMethod::Cod->value)
            ->assertJsonPath('data.payment_status', null)
            ->assertJsonMissingPath('data.payment');

        Http::assertNothingSent();
        Notification::assertSentTo($this->store->vendor, OrderPlacedNotification::class);
    }
}
