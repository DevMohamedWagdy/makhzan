<?php

namespace Tests\Feature\Api\V1\Vendor;

use App\Enums\ReviewStatus;
use App\Models\Product;
use App\Models\ProductReview;
use App\Models\StoreRole;
use App\Models\Vendor;
use App\Notifications\ReviewSubmittedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProductReviewControllerTest extends TestCase
{
    use RefreshDatabase;

    private Vendor $vendor;

    private Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        $this->vendor = $this->actingAsVendor();
        $this->product = Product::factory()->for($this->vendor->store)->create(['name' => 'تيشيرت قطن']);
    }

    public function test_lists_the_stores_reviews_with_filters_and_counts(): void
    {
        ProductReview::factory()->for($this->product)->approved()->create(['rating' => 5]);
        ProductReview::factory()->for($this->product)->approved()->create(['rating' => 2]);
        ProductReview::factory()->for($this->product)->create(['rating' => 1, 'customer_name' => 'كريم']);
        ProductReview::factory()->create();

        $this->getJson('/api/v1/vendor/reviews')
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('data.0.product.name', 'تيشيرت قطن')
            ->assertJsonPath('summary', ['pending' => 1, 'approved' => 2, 'rejected' => 0, 'total' => 3, 'average' => 3.5]);

        $this->getJson('/api/v1/vendor/reviews?status=pending')->assertJsonCount(1, 'data')->assertJsonPath('data.0.customer_name', 'كريم');
        $this->getJson('/api/v1/vendor/reviews?rating=5')->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/vendor/reviews?'.http_build_query(['search' => 'قطن']))->assertJsonCount(3, 'data');
        $this->getJson('/api/v1/vendor/reviews?'.http_build_query(['search' => 'كريم']))->assertJsonCount(1, 'data');
    }

    public function test_approving_and_rejecting_keeps_the_product_rating_in_step(): void
    {
        $five = ProductReview::factory()->for($this->product)->create(['rating' => 5]);
        $two = ProductReview::factory()->for($this->product)->create(['rating' => 2]);

        $this->patchJson("/api/v1/vendor/reviews/{$five->id}", ['status' => 'approved'])->assertOk()->assertJsonPath('data.status', 'approved');
        $this->patchJson("/api/v1/vendor/reviews/{$two->id}", ['status' => 'approved'])->assertOk();
        $this->assertSame(3.5, $this->product->fresh()->rating_average);
        $this->assertSame(2, $this->product->fresh()->reviews_count);

        $this->patchJson("/api/v1/vendor/reviews/{$two->id}", ['status' => 'rejected'])->assertOk();
        $this->assertSame(5.0, $this->product->fresh()->rating_average);
        $this->assertSame(1, $this->product->fresh()->reviews_count);

        $this->patchJson("/api/v1/vendor/reviews/{$five->id}", ['status' => 'unknown'])->assertJsonValidationErrors('status');
    }

    public function test_replies_to_a_review_and_removes_an_empty_reply(): void
    {
        $review = ProductReview::factory()->for($this->product)->approved()->create();

        $this->patchJson("/api/v1/vendor/reviews/{$review->id}", ['reply' => ' شكراً لتقييمك '])
            ->assertOk()
            ->assertJsonPath('data.reply', 'شكراً لتقييمك')
            ->assertJsonPath('data.status', 'approved');
        $this->assertNotNull($review->fresh()->replied_at);

        $this->patchJson("/api/v1/vendor/reviews/{$review->id}", ['reply' => ''])->assertOk()->assertJsonPath('data.reply', null);
        $this->assertNull($review->fresh()->replied_at);
    }

    public function test_deletes_a_review_with_its_photos_and_updates_the_rating(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('stores/1/reviews/a.jpg', 'x');
        $review = ProductReview::factory()->for($this->product)->approved()->create(['rating' => 4, 'images' => ['stores/1/reviews/a.jpg']]);
        $this->product->forceFill(['rating_average' => 4, 'reviews_count' => 1])->saveQuietly();

        $this->deleteJson("/api/v1/vendor/reviews/{$review->id}")->assertNoContent();

        $this->assertModelMissing($review);
        Storage::disk('public')->assertMissing('stores/1/reviews/a.jpg');
        $this->assertNull($this->product->fresh()->rating_average);
        $this->assertSame(0, $this->product->fresh()->reviews_count);
    }

    public function test_cannot_touch_another_stores_reviews(): void
    {
        $foreign = ProductReview::factory()->create();

        $this->patchJson("/api/v1/vendor/reviews/{$foreign->id}", ['status' => 'approved'])->assertNotFound();
        $this->deleteJson("/api/v1/vendor/reviews/{$foreign->id}")->assertNotFound();
        $this->assertSame(ReviewStatus::Pending, $foreign->fresh()->status);
    }

    public function test_staff_need_the_reviews_permission(): void
    {
        $role = StoreRole::factory()->for($this->vendor->store)->allowing(['reviews.view'])->create();
        $staff = $this->vendor->store->staff()->create([
            'full_name' => 'أحمد سمير',
            'phone' => '01077778888',
            'email' => 'ahmed@noor.test',
            'password' => 'Staff2026pass',
            'role_id' => $role->id,
        ]);
        Sanctum::actingAs($staff, [Vendor::TOKEN_ABILITY]);
        $review = ProductReview::factory()->for($this->product)->create();

        $this->getJson('/api/v1/vendor/reviews')->assertOk();
        $this->patchJson("/api/v1/vendor/reviews/{$review->id}", ['status' => 'approved'])->assertForbidden();
    }

    public function test_the_bell_announces_a_new_review(): void
    {
        $review = ProductReview::factory()->for($this->product)->create(['rating' => 4, 'customer_name' => 'منى أحمد']);
        $this->vendor->notify(new ReviewSubmittedNotification($review));

        $this->getJson('/api/v1/vendor/notifications')
            ->assertOk()
            ->assertJsonPath('data.0.type', 'review_submitted')
            ->assertJsonPath('data.0.message', 'تقييم جديد 4/5 من منى أحمد على تيشيرت قطن بانتظار موافقتك')
            ->assertJsonPath('data.0.details.review_id', $review->id);
    }
}
