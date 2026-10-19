<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Actions\Reviews\RefreshProductRating;
use App\Enums\ReviewStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\AdminReviewResource;
use App\Models\ProductReview;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

/**
 * Product reviews of every store: the platform can approve, hide or delete any of them.
 */
class ReviewController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'store_id' => ['nullable', 'integer'],
            'status' => ['nullable', Rule::enum(ReviewStatus::class)],
            'rating' => ['nullable', 'integer', 'between:1,5'],
            'search' => ['nullable', 'string', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $reviews = ProductReview::query()
            ->with(['store', 'product.images', 'order'])
            ->when($filters['store_id'] ?? null, fn ($query, int $storeId) => $query->where('store_id', $storeId))
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->when($filters['rating'] ?? null, fn ($query, int|string $rating) => $query->where('rating', $rating))
            ->when($filters['search'] ?? null, fn ($query, string $term) => $query->where(fn ($query) => $query
                ->where('customer_name', 'like', "%{$term}%")
                ->orWhere('body', 'like', "%{$term}%")
                ->orWhereHas('product', fn ($query) => $query->withTrashed()->where('name', 'like', "%{$term}%"))))
            ->latest('id')
            ->paginate(30)
            ->withQueryString();

        return AdminReviewResource::collection($reviews);
    }

    public function update(Request $request, ProductReview $review, RefreshProductRating $refreshRating): AdminReviewResource
    {
        $review->status = ReviewStatus::from($request->validate(['status' => ['required', Rule::enum(ReviewStatus::class)]])['status']);
        $review->save();

        if ($review->wasChanged('status')) {
            $refreshRating->handle($review->product);
        }

        return new AdminReviewResource($review->load(['store', 'product.images', 'order']));
    }

    public function destroy(ProductReview $review, RefreshProductRating $refreshRating): Response
    {
        $review->delete();
        Storage::disk('public')->delete($review->images ?? []);
        $refreshRating->handle($review->product);

        return response()->noContent();
    }
}
