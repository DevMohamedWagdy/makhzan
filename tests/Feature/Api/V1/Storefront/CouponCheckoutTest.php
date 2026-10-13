<?php

namespace Tests\Feature\Api\V1\Storefront;

use App\Actions\Orders\UpdateOrderStatus;
use App\Enums\CommissionStatus;
use App\Enums\CommissionType;
use App\Enums\CouponType;
use App\Enums\OrderStatus;
use App\Models\Affiliate;
use App\Models\Coupon;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\ProductVariant;
use App\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CouponCheckoutTest extends TestCase
{
    use RefreshDatabase;

    private const BASE = '/api/v1/storefront/noor-fashion';

    private Store $store;

    private Customer $customer;

    private ProductVariant $dress;

    private ProductVariant $shirt;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
        $this->store = Store::factory()->create(['slug' => 'noor-fashion']);
        $this->store->forceFill(['default_shipping_price' => 60])->save();
        $this->customer = Customer::factory()->for($this->store)->create(['phone' => '01055555555']);
        $this->dress = $this->variant('فستان', 400);
        $this->shirt = $this->variant('قميص', 200);
        Sanctum::actingAs($this->customer, [Customer::TOKEN_ABILITY]);
    }

    private function variant(string $name, float $price): ProductVariant
    {
        $variant = Product::factory()->for($this->store)->create(['name' => $name])->variants()->first();
        $variant->update(['price' => $price, 'stock' => 20]);

        return $variant;
    }

    private function coupon(array $attributes = []): Coupon
    {
        return Coupon::factory()->for($this->store)->create(['code' => 'SAVE10', ...$attributes]);
    }

    private function checkout(?string $code, ?array $items = null)
    {
        return $this->postJson(self::BASE.'/customer/orders', [
            'items' => $items ?? [['variant_id' => $this->dress->id, 'quantity' => 2], ['variant_id' => $this->shirt->id, 'quantity' => 1]],
            'address' => ['recipient_name' => 'منى أحمد', 'phone' => '01012345678', 'governorate_id' => 'cairo', 'city_id' => 'maadi', 'address_line' => '5 شارع 9'],
            'coupon_code' => $code,
        ]);
    }

    public function test_a_percentage_coupon_is_taken_off_the_products_and_capped(): void
    {
        $this->coupon(['value' => 20, 'max_discount' => 150]);

        $this->checkout('save10')
            ->assertCreated()
            ->assertJsonPath('data.subtotal', 1000)
            ->assertJsonPath('data.discount', 150)
            ->assertJsonPath('data.coupon_code', 'SAVE10')
            ->assertJsonPath('data.total', 910);
    }

    public function test_fixed_and_free_shipping_coupons(): void
    {
        $this->coupon(['code' => 'FIXED', 'type' => CouponType::Fixed, 'value' => 100]);
        $this->coupon(['code' => 'SHIP', 'type' => CouponType::FreeShipping, 'value' => null]);

        $this->checkout('FIXED')->assertJsonPath('data.discount', 100)->assertJsonPath('data.total', 960);
        $this->checkout('SHIP')->assertJsonPath('data.discount', 0)->assertJsonPath('data.shipping_discount', 60)->assertJsonPath('data.total', 1000);
    }

    public function test_coupons_limited_to_products_or_categories_discount_only_those(): void
    {
        $category = ProductCategory::factory()->for($this->store)->create();
        $this->shirt->product->update(['category_id' => $category->id]);
        $this->coupon(['code' => 'SHIRTS', 'value' => 50, 'applies_to' => Coupon::APPLIES_TO_CATEGORIES, 'category_ids' => [$category->id]]);
        $this->coupon(['code' => 'DRESS', 'type' => CouponType::Fixed, 'value' => 5000, 'applies_to' => Coupon::APPLIES_TO_PRODUCTS, 'product_ids' => [$this->dress->product_id]]);

        $this->checkout('SHIRTS')->assertJsonPath('data.discount', 100);
        $this->checkout('DRESS')->assertJsonPath('data.discount', 800);
        $this->checkout('SHIRTS', [['variant_id' => $this->dress->id, 'quantity' => 1]])->assertJsonValidationErrors(['coupon_code' => 'كود الخصم لا ينطبق على المنتجات في سلتك']);
    }

    public function test_rejects_codes_that_dont_apply_and_leaves_stock_alone(): void
    {
        $this->coupon(['code' => 'OFF', 'is_active' => false]);
        $this->coupon(['code' => 'OLD', 'ends_at' => now()->subDay()]);
        $this->coupon(['code' => 'SOON', 'starts_at' => now()->addWeek()]);
        $this->coupon(['code' => 'BIG', 'min_subtotal' => 1500]);

        $this->checkout('NOPE')->assertJsonValidationErrors(['coupon_code' => 'كود الخصم غير صحيح']);
        $this->checkout('OFF')->assertJsonValidationErrors(['coupon_code' => 'كود الخصم غير صحيح']);
        $this->checkout('OLD')->assertJsonValidationErrors(['coupon_code' => 'انتهت صلاحية كود الخصم']);
        $this->checkout('SOON')->assertJsonValidationErrors('coupon_code');
        $this->checkout('BIG')->assertJsonValidationErrors(['coupon_code' => 'كود الخصم لطلبات من 1,500.00 ج.م، أضف منتجات بقيمة 500.00 ج.م']);

        $this->assertSame(0, Order::count());
        $this->assertSame(20, $this->dress->fresh()->stock);
    }

    public function test_usage_limits_count_orders_that_were_not_cancelled(): void
    {
        $this->coupon(['usage_limit' => 1, 'per_customer_limit' => null]);

        $orderId = $this->checkout('SAVE10')->assertCreated()->json('data.order_id');
        $this->checkout('SAVE10')->assertJsonValidationErrors(['coupon_code' => 'تم استخدام كود الخصم بالكامل']);

        app(UpdateOrderStatus::class)->handle(Order::find($orderId), OrderStatus::Cancelled, 'customer');

        $this->checkout('SAVE10')->assertCreated();
    }

    public function test_per_customer_and_first_order_limits(): void
    {
        $this->coupon(['per_customer_limit' => 1]);
        $this->coupon(['code' => 'WELCOME', 'first_order_only' => true]);

        $this->checkout('SAVE10')->assertCreated();
        $this->checkout('SAVE10')->assertJsonValidationErrors(['coupon_code' => 'استخدمت كود الخصم هذا من قبل']);
        $this->checkout('WELCOME')->assertJsonValidationErrors(['coupon_code' => 'كود الخصم لأول طلب فقط']);
    }

    public function test_an_affiliate_coupon_credits_the_affiliate_on_the_discounted_products(): void
    {
        $affiliate = Affiliate::factory()->for($this->store)->create(['phone' => '01099999999']);
        $affiliate->setCommissionOverride(CommissionType::Percentage, 10);
        $this->coupon(['code' => 'SARA', 'value' => 10, 'affiliate_id' => $affiliate->id]);

        $orderId = $this->checkout('SARA')->assertCreated()->json('data.order_id');
        $order = Order::find($orderId);

        $this->assertSame($affiliate->id, $order->affiliate_id);
        $this->assertSame('SARA', $order->referral_code);
        $this->assertSame(90.0, $order->commission_amount);
        $this->assertSame(CommissionStatus::Pending, $order->commission_status);
    }

    public function test_affiliates_cannot_use_their_own_coupon(): void
    {
        $affiliate = Affiliate::factory()->for($this->store)->create(['phone' => $this->customer->phone]);
        $this->coupon(['code' => 'MINE', 'affiliate_id' => $affiliate->id]);

        $this->checkout('MINE')->assertJsonValidationErrors(['coupon_code' => 'لا يمكنك استخدام كود الخصم الخاص بك']);
    }

    public function test_checks_a_code_against_the_cart_before_ordering(): void
    {
        $this->coupon(['value' => 10]);

        $this->postJson(self::BASE.'/customer/coupon', ['coupon_code' => 'save10', 'items' => [['variant_id' => $this->dress->id, 'quantity' => 1]]])
            ->assertOk()
            ->assertJson(['code' => 'SAVE10', 'type' => 'percentage', 'discount' => 40, 'free_shipping' => false]);

        $this->postJson(self::BASE.'/customer/coupon', ['coupon_code' => 'X', 'items' => [['variant_id' => $this->dress->id, 'quantity' => 1]]])->assertJsonValidationErrors('coupon_code');
    }
}
