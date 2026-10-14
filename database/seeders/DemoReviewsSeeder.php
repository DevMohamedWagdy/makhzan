<?php

namespace Database\Seeders;

use App\Actions\Reviews\RefreshProductRating;
use App\Enums\OrderStatus;
use App\Enums\ReviewStatus;
use App\Models\Order;
use App\Models\Product;
use App\Models\Store;
use Illuminate\Database\Seeder;

/**
 * Reviews from demo customers on products they received, mostly approved and a few still
 * waiting for the vendor. Runs after DemoOrdersSeeder. Local use only.
 */
class DemoReviewsSeeder extends Seeder
{
    /** @var list<array{rating: int, body: string|null, reply: string|null}> */
    private const REVIEWS = [
        ['rating' => 5, 'body' => 'الخامة ممتازة والمقاس مظبوط جداً، والتوصيل كان سريع.', 'reply' => 'شكراً لذوقك، نورتنا!'],
        ['rating' => 4, 'body' => 'المنتج حلو بس اللون أغمق شوية من الصورة.', 'reply' => null],
        ['rating' => 5, 'body' => 'تاني مرة أطلب منهم وكل مرة الجودة أحسن.', 'reply' => null],
        ['rating' => 3, 'body' => 'كويس بالنسبة لسعره، المقاس جه واسع شوية.', 'reply' => 'نأسف لذلك، تقدر تستبدله بمقاس أصغر بدون مصاريف.'],
        ['rating' => 5, 'body' => null, 'reply' => null],
        ['rating' => 4, 'body' => 'التغليف شيك والمنتج زي الوصف بالظبط.', 'reply' => null],
        ['rating' => 2, 'body' => 'الخياطة مش مظبوطة في جزء من الكم.', 'reply' => null],
    ];

    public function run(RefreshProductRating $refreshRating): void
    {
        Store::query()->whereIn('slug', DemoVendorSeeder::STORE_SLUGS)->get()->each(function (Store $store) use ($refreshRating): void {
            if ($store->productReviews()->exists()) {
                return;
            }

            $store->orders()->where('status', OrderStatus::Delivered)->whereNotNull('customer_id')->with(['items', 'customer'])->get()
                ->take(count(self::REVIEWS))
                ->values()
                ->each(fn (Order $order, int $index) => $this->review($store, $order, $index));

            $store->products()->whereHas('reviews')->get()->each(fn (Product $product) => $refreshRating->handle($product));
        });
    }

    private function review(Store $store, Order $order, int $index): void
    {
        $product = Product::query()->find($order->items->first()?->product_id);

        if (! $product || $product->reviews()->where('customer_id', $order->customer_id)->exists()) {
            return;
        }

        ['rating' => $rating, 'body' => $body, 'reply' => $reply] = self::REVIEWS[$index];

        $review = $product->reviews()->make([
            'customer_id' => $order->customer_id,
            'order_id' => $order->id,
            'customer_name' => $order->customer->full_name,
            'rating' => $rating,
            'body' => $body,
            'status' => $index >= 5 ? ReviewStatus::Pending : ReviewStatus::Approved,
            'reply' => $reply,
            'replied_at' => $reply ? now() : null,
        ]);
        $review->store()->associate($store);
        $review->save();
    }
}
