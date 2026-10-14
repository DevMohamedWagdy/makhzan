<?php

namespace Tests\Feature\Notifications;

use App\Actions\Orders\UpdateOrderStatus;
use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderEvent;
use App\Models\Product;
use App\Models\Store;
use App\Notifications\CustomerOrderUpdateNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CustomerOrderUpdateNotificationTest extends TestCase
{
    use RefreshDatabase;

    private Store $store;

    private Customer $customer;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
        $this->store = Store::factory()->create(['slug' => 'noor-fashion', 'name' => 'نور للأزياء', 'contact_email' => 'hello@noor.test', 'default_shipping_price' => 60]);
        $this->customer = Customer::factory()->for($this->store)->create(['email' => 'mona@example.com']);
    }

    private function order(OrderStatus $status = OrderStatus::Pending): Order
    {
        return Order::factory()->for($this->store)->for($this->customer)->status($status)->create(['total' => 860]);
    }

    public function test_placing_an_order_emails_the_customer_a_receipt(): void
    {
        $variant = Product::factory()->for($this->store)->create(['name' => 'فستان'])->variants()->first();
        $variant->update(['price' => 400, 'stock' => 5]);
        Sanctum::actingAs($this->customer, [Customer::TOKEN_ABILITY]);

        $this->postJson('/api/v1/storefront/noor-fashion/customer/orders', [
            'items' => [['variant_id' => $variant->id, 'quantity' => 2]],
            'address' => ['recipient_name' => 'منى أحمد', 'phone' => '01012345678', 'governorate_id' => 'cairo', 'city_id' => 'maadi', 'address_line' => '5 شارع 9'],
        ])->assertCreated();

        Notification::assertSentTo($this->customer, CustomerOrderUpdateNotification::class, function (CustomerOrderUpdateNotification $notification): bool {
            $mail = $notification->toMail($this->customer);

            return $notification->status === OrderStatus::Pending
                && $mail->subject === "استلمنا طلبك #{$notification->order->number} - نور للأزياء"
                && in_array('فستان × 2 — 800.00 ج.م', $mail->introLines, true)
                && $mail->actionUrl === url("/noor-fashion/account/orders/{$notification->order->number}")
                && $mail->replyTo === [['hello@noor.test', 'نور للأزياء']];
        });
    }

    public function test_each_status_change_by_the_vendor_emails_the_customer(): void
    {
        $order = $this->order();
        $updateStatus = app(UpdateOrderStatus::class);

        foreach ([OrderStatus::Confirmed, OrderStatus::Shipped, OrderStatus::Delivered] as $status) {
            $updateStatus->handle($order, $status, OrderEvent::ACTOR_VENDOR);

            Notification::assertSentTo($this->customer, CustomerOrderUpdateNotification::class, fn (CustomerOrderUpdateNotification $notification): bool => $notification->status === $status);
        }

        Notification::assertSentToTimes($this->customer, CustomerOrderUpdateNotification::class, 3);
    }

    public function test_shipped_email_reminds_cash_on_delivery_customers_to_have_the_amount_ready(): void
    {
        $codOrder = $this->order(OrderStatus::Confirmed);
        $paidOrder = Order::factory()->for($this->store)->for($this->customer)->online()->status(OrderStatus::Confirmed)->create(['total' => 500]);

        $codMail = (new CustomerOrderUpdateNotification($codOrder, OrderStatus::Shipped))->toMail($this->customer);
        $paidMail = (new CustomerOrderUpdateNotification($paidOrder, OrderStatus::Shipped))->toMail($this->customer);

        $this->assertContains('برجاء تجهيز مبلغ 860.00 ج.م للدفع عند الاستلام.', $codMail->introLines);
        $this->assertNotContains('برجاء تجهيز مبلغ 500.00 ج.م للدفع عند الاستلام.', $paidMail->introLines);
    }

    public function test_cancellation_email_includes_the_vendors_reason(): void
    {
        app(UpdateOrderStatus::class)->handle($this->order(), OrderStatus::Cancelled, OrderEvent::ACTOR_VENDOR, 'المنتج غير متوفر');

        Notification::assertSentTo($this->customer, CustomerOrderUpdateNotification::class, function (CustomerOrderUpdateNotification $notification): bool {
            return in_array('السبب: المنتج غير متوفر', $notification->toMail($this->customer)->introLines, true);
        });
    }

    public function test_customers_are_not_emailed_about_their_own_cancellation(): void
    {
        app(UpdateOrderStatus::class)->handle($this->order(), OrderStatus::Cancelled, OrderEvent::ACTOR_CUSTOMER);

        Notification::assertNotSentTo($this->customer, CustomerOrderUpdateNotification::class);
    }

    public function test_an_unpaid_online_order_that_expires_sends_nothing(): void
    {
        $order = Order::factory()->for($this->store)->for($this->customer)->online(PaymentStatus::Pending)->create();

        app(UpdateOrderStatus::class)->handle($order, OrderStatus::Cancelled, OrderEvent::ACTOR_SYSTEM, onlyIfUnpaid: true);

        Notification::assertNotSentTo($this->customer, CustomerOrderUpdateNotification::class);
    }

    public function test_customers_without_an_email_are_skipped(): void
    {
        $this->customer->update(['email' => null]);

        app(UpdateOrderStatus::class)->handle($this->order(), OrderStatus::Confirmed, OrderEvent::ACTOR_VENDOR);

        Notification::assertNotSentTo($this->customer, CustomerOrderUpdateNotification::class);
    }
}
