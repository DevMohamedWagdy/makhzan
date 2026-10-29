<?php

namespace Tests\Feature\Api\V1\Storefront;

use App\Enums\OrderStatus;
use App\Enums\ReviewStatus;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductReview;
use App\Models\Store;
use App\Models\Vendor;
use App\Notifications\ReviewSubmittedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProductReviewTest extends TestCase
{
    use RefreshDatabase;

    private Store $store;

    private Product $product;

    private Customer $customer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->store = Vendor::factory()->withStore()->create()->store;
        $this->product = Product::factory()->for($this->store)->create(['slug' => 'tshirt']);
        $this->customer = Customer::factory()->for($this->store)->create(['full_name' => 'منى أحمد علي']);
    }

    private function receive(Product $product, OrderStatus $status = OrderStatus::Delivered): Order
    {
        $order = Order::factory()->for($this->store)->for($this->customer)->status($status)->create();
        OrderItem::factory()->for($order)->create(['product_id' => $product->id]);

        return $order;
    }

    private function url(string $path = 'review'): string
    {
        return "/api/v1/storefront/{$this->store->slug}/customer/products/tshirt/{$path}";
    }

    public function test_a_customer_reviews_a_product_they_received_and_it_waits_for_approval(): void
    {
        Notification::fake();
        Storage::fake('public');
        $order = $this->receive($this->product);
        Sanctum::actingAs($this->customer, [Customer::TOKEN_ABILITY]);

        $this->getJson($this->url())->assertOk()->assertJson(['can_review' => true, 'review' => null]);

        $this->post($this->url(), [
            'rating' => 4,
            'body' => 'خامة ممتازة',
            'images' => [UploadedFile::fake()->image('photo.jpg')],
        ], ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJsonPath('data.customer_name', 'منى')
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonCount(1, 'data.image_urls');

        $review = ProductReview::query()->sole();
        Notification::assertSentTo($this->store->vendor, ReviewSubmittedNotification::class, fn (ReviewSubmittedNotification $notification): bool => $notification->review->is($review)
            && $notification->toArray($this->store->vendor)['product_name'] === $this->product->name);
        $this->assertSame($order->id, $review->order_id);
        $this->assertSame($this->store->id, $review->store_id);
        Storage::disk('public')->assertExists($review->images[0]);

        $this->getJson($this->url())->assertJsonPath('can_review', false)->assertJsonPath('review.rating', 4);
        $this->getJson("/api/v1/storefront/{$this->store->slug}/products/tshirt/reviews")->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_only_customers_who_received_the_product_can_review_it_once(): void
    {
        Sanctum::actingAs($this->customer, [Customer::TOKEN_ABILITY]);
        $this->receive($this->product, OrderStatus::Shipped);

        $this->getJson($this->url())->assertJsonPath('can_review', false);
        $this->postJson($this->url(), ['rating' => 5])->assertJsonValidationErrors(['rating' => __('reviews.not_purchased')]);

        $this->receive($this->product);
        $this->postJson($this->url(), ['rating' => 5])->assertCreated();
        $this->postJson($this->url(), ['rating' => 1])->assertJsonValidationErrors(['rating' => __('reviews.already_reviewed')]);
    }

    public function test_validates_the_review(): void
    {
        Sanctum::actingAs($this->customer, [Customer::TOKEN_ABILITY]);
        $this->receive($this->product);

        $this->postJson($this->url(), ['rating' => 6])->assertJsonValidationErrors('rating');
        $this->postJson($this->url(), ['rating' => 3, 'body' => str_repeat('a', 1001)])->assertJsonValidationErrors('body');
        $this->postJson($this->url(), [])->assertJsonValidationErrors('rating');
    }

    public function test_a_photo_the_server_refused_as_too_large_gets_a_readable_error(): void
    {
        Sanctum::actingAs($this->customer, [Customer::TOKEN_ABILITY]);
        $this->receive($this->product);
        $refused = new UploadedFile(UploadedFile::fake()->image('screenshot.png')->getPathname(), 'screenshot.png', 'image/png', UPLOAD_ERR_INI_SIZE, true);

        $this->post($this->url(), ['rating' => 4, 'images' => [$refused]], ['Accept' => 'application/json'])
            ->assertJsonValidationErrors(['images.0' => __('forms.image_too_large', ['size' => 4])]);
    }

    public function test_reviewing_needs_a_signed_in_customer(): void
    {
        $this->postJson($this->url(), ['rating' => 5])->assertUnauthorized();
    }

    public function test_shoppers_see_approved_reviews_with_the_rating_summary(): void
    {
        ProductReview::factory()->for($this->product)->approved()->create(['rating' => 5, 'customer_name' => 'سارة محمود', 'reply' => 'شكراً لك']);
        ProductReview::factory()->for($this->product)->approved()->create(['rating' => 4]);
        ProductReview::factory()->for($this->product)->create(['rating' => 1]);
        ProductReview::factory()->for($this->product)->create(['rating' => 1, 'status' => ReviewStatus::Rejected]);
        $this->product->forceFill(['rating_average' => 4.5, 'reviews_count' => 2])->saveQuietly();

        $this->getJson("/api/v1/storefront/{$this->store->slug}/products/tshirt/reviews")
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.1.customer_name', 'سارة')
            ->assertJsonPath('data.1.reply', 'شكراً لك')
            ->assertJsonPath('summary.average', 4.5)
            ->assertJsonPath('summary.count', 2)
            ->assertJsonPath('summary.stars', ['5' => 1, '4' => 1, '3' => 0, '2' => 0, '1' => 0]);

        $this->getJson("/api/v1/storefront/{$this->store->slug}/products/tshirt")
            ->assertJsonPath('product.rating_average', 4.5)
            ->assertJsonPath('product.reviews_count', 2);
    }
}
