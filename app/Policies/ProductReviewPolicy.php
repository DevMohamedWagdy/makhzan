<?php

namespace App\Policies;

use App\Models\ProductReview;
use App\Models\Vendor;
use Illuminate\Auth\Access\Response;

class ProductReviewPolicy
{
    /**
     * A vendor may moderate only their own store's reviews; others are reported as missing (404).
     */
    public function update(Vendor $vendor, ProductReview $review): Response
    {
        return $vendor->store?->id === $review->store_id
            ? Response::allow()
            : Response::denyAsNotFound(__('reviews.not_found'));
    }

    public function delete(Vendor $vendor, ProductReview $review): Response
    {
        return $this->update($vendor, $review);
    }
}
