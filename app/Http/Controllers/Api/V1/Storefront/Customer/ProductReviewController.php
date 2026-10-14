<?php

namespace App\Http\Controllers\Api\V1\Storefront\Customer;

use App\Actions\Reviews\FindReviewableOrder;
use App\Enums\ReviewStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Storefront\Customer\StoreProductReviewRequest;
use App\Http\Resources\StorefrontReviewResource;
use App\Models\Product;
use App\Models\Store;
use App\Notifications\ReviewSubmittedNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;

class ProductReviewController extends Controller
{
    /**
     * Whether the signed-in customer can review the product, and their review if they did.
     */
    public function show(Request $request, Store $store, string $productSlug, FindReviewableOrder $findOrder): JsonResponse
    {
        $product = $this->product($store, $productSlug);
        $review = $product->reviews()->where('customer_id', $request->user()->id)->first();

        return response()->json([
            'can_review' => ! $review && $findOrder->handle($request->user(), $product) !== null,
            'review' => $review ? new StorefrontReviewResource($review) : null,
        ]);
    }

    /**
     * Review a product the customer received (once per product). It waits for the vendor's
     * approval before shoppers see it.
     */
    public function store(StoreProductReviewRequest $request, Store $store, string $productSlug, FindReviewableOrder $findOrder): JsonResponse
    {
        $customer = $request->user();
        $product = $this->product($store, $productSlug);

        if ($product->reviews()->where('customer_id', $customer->id)->exists()) {
            throw ValidationException::withMessages(['rating' => __('reviews.already_reviewed')]);
        }

        $order = $findOrder->handle($customer, $product) ?? throw ValidationException::withMessages(['rating' => __('reviews.not_purchased')]);

        $review = $product->reviews()->make([
            'customer_id' => $customer->id,
            'order_id' => $order->id,
            'customer_name' => $customer->full_name,
            'rating' => $request->validated('rating'),
            'body' => $request->validated('body'),
            'images' => array_map(fn (UploadedFile $file): string => $file->store("stores/{$store->id}/reviews", 'public'), $request->file('images', [])),
            'status' => ReviewStatus::Pending,
        ]);
        $review->store()->associate($store);
        $review->save();
        $store->vendor->notify(new ReviewSubmittedNotification($review->setRelation('product', $product)));

        return (new StorefrontReviewResource($review))->response()->setStatusCode(Response::HTTP_CREATED);
    }

    private function product(Store $store, string $productSlug): Product
    {
        return $store->products()->visibleInStore()->where('slug', $productSlug)->first() ?? abort(404, __('products.not_found'));
    }
}
