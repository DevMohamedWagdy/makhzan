<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Actions\Reviews\RefreshProductRating;
use App\Enums\ReviewStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Vendor\UpdateProductReviewRequest;
use App\Http\Resources\ProductReviewResource;
use App\Models\ProductReview;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ProductReviewController extends Controller
{
    /**
     * The store's reviews, newest first, by status, star rating or product name, with counts
     * per status and the store's average rating.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'status' => ['nullable', Rule::enum(ReviewStatus::class)],
            'rating' => ['nullable', 'integer', 'between:1,5'],
            'search' => ['nullable', 'string', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);
        $store = $request->user()->store;

        $reviews = $store->productReviews()
            ->with(['product.images', 'order'])
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->when($filters['rating'] ?? null, fn ($query, int|string $rating) => $query->where('rating', $rating))
            ->when($filters['search'] ?? null, fn ($query, string $term) => $query->where(fn ($query) => $query
                ->where('customer_name', 'like', "%{$term}%")
                ->orWhereHas('product', fn ($query) => $query->withTrashed()->where('name', 'like', "%{$term}%"))))
            ->latest('id')
            ->paginate(20)
            ->withQueryString();

        $counts = $store->productReviews()->toBase()->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');
        $average = $store->productReviews()->where('status', ReviewStatus::Approved)->avg('rating');

        return ProductReviewResource::collection($reviews)->additional(['summary' => [
            ...collect(ReviewStatus::cases())->mapWithKeys(fn (ReviewStatus $status): array => [$status->value => (int) ($counts[$status->value] ?? 0)]),
            'total' => (int) $counts->sum(),
            'average' => $average === null ? null : round((float) $average, 2),
        ]]);
    }

    /**
     * Approve, reject or reply to a review; the product's rating follows its approved reviews.
     */
    public function update(UpdateProductReviewRequest $request, ProductReview $review, RefreshProductRating $refreshRating): ProductReviewResource
    {
        if ($request->has('status')) {
            $review->status = ReviewStatus::from($request->validated('status'));
        }

        if ($request->has('reply')) {
            $reply = trim((string) $request->validated('reply'));
            $review->reply = $reply === '' ? null : $reply;
            $review->replied_at = $reply === '' ? null : now();
        }

        $review->save();

        if ($review->wasChanged('status')) {
            $refreshRating->handle($review->product);
        }

        return new ProductReviewResource($review->load(['product.images', 'order']));
    }

    public function destroy(ProductReview $review, RefreshProductRating $refreshRating): Response
    {
        Gate::authorize('delete', $review);

        $review->delete();
        Storage::disk('public')->delete($review->images ?? []);
        $refreshRating->handle($review->product);

        return response()->noContent();
    }
}
