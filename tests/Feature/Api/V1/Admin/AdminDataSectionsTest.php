<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Enums\AffiliateStatus;
use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Enums\ReviewStatus;
use App\Models\Admin;
use App\Models\Affiliate;
use App\Models\AffiliatePayout;
use App\Models\Coupon;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductReview;
use App\Models\Store;
use App\Models\Vendor;
use App\Notifications\CustomerOrderUpdateNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * The admin panel sees every store's customers, affiliates, products, payments, payouts,
 * coupons and reviews, and can act on orders, affiliates and reviews.
 */
class AdminDataSectionsTest extends TestCase
{
    use RefreshDatabase;

    private Store $noor;

    private Store $wagdy;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
        $this->noor = Store::factory()->create(['name' => 'نور']);
        $this->wagdy = Store::factory()->create(['name' => 'وجدي']);
        Sanctum::actingAs(Admin::factory()->create(), [Admin::TOKEN_ABILITY]);
    }

    public function test_lists_span_every_store_and_filter_by_one(): void
    {
        foreach ([$this->noor, $this->wagdy] as $store) {
            Customer::factory()->for($store)->create();
            $affiliate = Affiliate::factory()->for($store)->create();
            AffiliatePayout::factory()->for($affiliate)->create();
            Coupon::factory()->for($store)->create();
            ProductReview::factory()->for(Product::factory()->for($store))->create();
            Payment::factory()->for(Order::factory()->for($store))->create(['status' => PaymentStatus::Paid]);
        }

        // Factories add related rows (an order's customer, a review's product), so compare with the tables.
        $models = ['customers' => Customer::class, 'affiliates' => Affiliate::class, 'products' => Product::class, 'payments' => Payment::class, 'payouts' => AffiliatePayout::class, 'coupons' => Coupon::class, 'reviews' => ProductReview::class];

        foreach ($models as $section => $model) {
            $this->getJson("/api/v1/admin/{$section}")->assertOk()->assertJsonCount($model::count(), 'data');
            $this->getJson("/api/v1/admin/{$section}?store_id={$this->wagdy->id}")
                ->assertOk()
                ->assertJsonCount($model::query()->where('store_id', $this->wagdy->id)->count(), 'data')
                ->assertJsonPath('data.*.store.name', fn (array $names): bool => $names !== [] && array_unique($names) === ['وجدي']);
        }
    }

    public function test_customer_and_affiliate_profiles_include_their_orders(): void
    {
        $customer = Customer::factory()->for($this->noor)->create();
        $affiliate = Affiliate::factory()->for($this->noor)->create();
        $order = Order::factory()->for($this->noor)->for($customer)->create(['affiliate_id' => $affiliate->id]);

        $this->getJson("/api/v1/admin/customers/{$customer->id}")->assertOk()->assertJsonPath('data.store.name', 'نور')->assertJsonPath('orders.0.order_id', $order->id);
        $this->getJson("/api/v1/admin/affiliates/{$affiliate->id}")->assertOk()->assertJsonPath('data.store.name', 'نور')->assertJsonPath('orders.0.order_id', $order->id);
    }

    public function test_admins_change_an_orders_status_and_the_history_says_so(): void
    {
        $order = Order::factory()->for($this->noor)->create();

        $this->patchJson("/api/v1/admin/orders/{$order->id}/status", ['status' => 'confirmed'])
            ->assertOk()
            ->assertJsonPath('data.status', 'confirmed');

        $this->assertSame(OrderStatus::Confirmed, $order->fresh()->status);
        $this->assertSame('admin', $order->events()->latest('id')->value('actor'));
        Notification::assertSentTo($order->customer, CustomerOrderUpdateNotification::class);
    }

    public function test_admins_freeze_affiliates_and_moderate_reviews(): void
    {
        $affiliate = Affiliate::factory()->for($this->noor)->create(['status' => AffiliateStatus::Active]);
        $review = ProductReview::factory()->for(Product::factory()->for($this->noor))->create();

        $this->patchJson("/api/v1/admin/affiliates/{$affiliate->id}/status", ['status' => 'frozen', 'reason' => 'سلوك مخالف'])->assertOk()->assertJsonPath('data.status', 'frozen');
        $this->patchJson("/api/v1/admin/reviews/{$review->id}", ['status' => 'rejected'])->assertOk()->assertJsonPath('data.status', 'rejected');

        $this->assertSame(AffiliateStatus::Frozen, $affiliate->fresh()->status);
        $this->assertSame(ReviewStatus::Rejected, $review->fresh()->status);

        $this->deleteJson("/api/v1/admin/reviews/{$review->id}")->assertNoContent();
        $this->assertModelMissing($review);
    }

    public function test_each_section_needs_its_permission(): void
    {
        Sanctum::actingAs(Admin::factory()->withPermissions(['orders.view'])->create(), [Admin::TOKEN_ABILITY]);
        $order = Order::factory()->for($this->noor)->create();

        $this->getJson('/api/v1/admin/orders')->assertOk();
        $this->patchJson("/api/v1/admin/orders/{$order->id}/status", ['status' => 'confirmed'])->assertForbidden();

        foreach (['customers', 'affiliates', 'products', 'payments', 'payouts', 'coupons', 'reviews'] as $section) {
            $this->getJson("/api/v1/admin/{$section}")->assertForbidden();
        }
    }

    public function test_vendors_who_have_signed_in_are_listed(): void
    {
        $vendor = Vendor::factory()->withStore()->create(['last_login_at' => now()->subHour()]);

        $this->getJson('/api/v1/admin/vendors')
            ->assertOk()
            ->assertJsonPath('data.0.vendor_id', $vendor->id)
            ->assertJsonPath('data.0.last_login_at', fn ($value): bool => $value !== null);
    }
}
