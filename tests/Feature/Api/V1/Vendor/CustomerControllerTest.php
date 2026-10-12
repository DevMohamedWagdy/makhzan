<?php

namespace Tests\Feature\Api\V1\Vendor;

use App\Enums\OrderStatus;
use App\Models\Customer;
use App\Models\CustomerAddress;
use App\Models\Order;
use App\Models\Vendor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerControllerTest extends TestCase
{
    use RefreshDatabase;

    private Vendor $vendor;

    protected function setUp(): void
    {
        parent::setUp();

        $this->vendor = $this->actingAsVendor();
    }

    private function customer(array $attributes = []): Customer
    {
        return Customer::factory()->create(['store_id' => $this->vendor->store->id, ...$attributes]);
    }

    private function order(Customer $customer, OrderStatus $status, float $total): Order
    {
        return Order::factory()->for($this->vendor->store)->status($status)->create(['customer_id' => $customer->id, 'total' => $total]);
    }

    public function test_lists_the_stores_customers_with_their_order_stats(): void
    {
        $mona = $this->customer(['full_name' => 'منى أحمد', 'phone' => '01012345678']);
        $this->order($mona, OrderStatus::Delivered, 500);
        $this->order($mona, OrderStatus::Delivered, 300);
        $this->order($mona, OrderStatus::Cancelled, 900);
        $this->order($mona, OrderStatus::Pending, 200);
        $this->travel(1)->minutes();
        $newest = $this->customer();
        Customer::factory()->create();

        $this->getJson('/api/v1/vendor/customers')
            ->assertOk()
            ->assertJsonPath('data.*.customer_id', [$newest->id, $mona->id])
            ->assertJsonPath('data.1.stats', [
                'orders_count' => 4,
                'delivered_orders' => 2,
                'failed_orders' => 1,
                'total_spent' => 800,
                'average_order' => 400,
            ]);

        $this->getJson('/api/v1/vendor/customers?sort=spent')->assertJsonPath('data.0.customer_id', $mona->id);
        $this->getJson('/api/v1/vendor/customers?buyers=1')->assertJsonPath('data.*.customer_id', [$mona->id]);
        $this->getJson('/api/v1/vendor/customers?search=0101234')->assertJsonPath('data.*.customer_id', [$mona->id]);
        $this->getJson('/api/v1/vendor/customers?search='.urlencode('منى'))->assertJsonPath('data.*.customer_id', [$mona->id]);
    }

    public function test_shows_a_customer_with_addresses_and_filters_orders_by_customer(): void
    {
        $customer = $this->customer();
        CustomerAddress::factory()->for($customer)->create();
        $order = $this->order($customer, OrderStatus::Delivered, 450);
        $this->order($this->customer(), OrderStatus::Pending, 100);

        $this->getJson("/api/v1/vendor/customers/{$customer->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data.addresses')
            ->assertJsonPath('data.stats.total_spent', 450);

        $this->getJson("/api/v1/vendor/orders?customer_id={$customer->id}")->assertJsonPath('data.*.order_id', [$order->id]);
    }

    public function test_another_stores_customer_is_not_found(): void
    {
        $this->getJson('/api/v1/vendor/customers/'.Customer::factory()->create()->id)->assertNotFound();
    }

    public function test_summary_counts_accounts_new_sign_ups_and_repeat_buyers(): void
    {
        $repeat = $this->customer(['created_at' => now()->subMonths(2)]);
        $this->order($repeat, OrderStatus::Delivered, 100);
        $this->order($repeat, OrderStatus::Pending, 100);
        $this->order($this->customer(), OrderStatus::Pending, 100);
        $this->customer();

        $this->getJson('/api/v1/vendor/customers/summary')
            ->assertOk()
            ->assertExactJson(['total' => 3, 'new_this_month' => 2, 'buyers' => 2, 'repeat_buyers' => 1]);
    }
}
