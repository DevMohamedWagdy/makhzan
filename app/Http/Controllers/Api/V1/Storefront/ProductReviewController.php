<?php

namespace App\Http\Controllers\Api\V1\Storefront;

use App\Enums\ReviewStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\StorefrontReviewResource;
use App\Models\Store;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProductReviewController extends Controller
{
    /**
     * A product's approved reviews, newest first, 10 per page, with the rating summary
     * (average, count and how many reviews gave each star).
     */
    public function index(Store $store, string $productSlug): AnonymousResourceCollection
    {
        $product = $store->products()->visibleInStore()->where('slug', $productSlug)->first() ?? abort(404, __('products.not_found'));
        $approved = fn () => $product->reviews()->where('status', ReviewStatus::Approved);

        $stars = $approved()->toBase()->selectRaw('rating, count(*) as total')->groupBy('rating')->pluck('total', 'rating');

        return StorefrontReviewResource::collection($approved()->latest('id')->paginate(10))->additional(['summary' => [
            'average' => $product->rating_average,
            'count' => $product->reviews_count,
            'stars' => collect(range(5, 1))->mapWithKeys(fn (int $rating): array => [$rating => (int) ($stars[$rating] ?? 0)]),
        ]]);
    }
}
