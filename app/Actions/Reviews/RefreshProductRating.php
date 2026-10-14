<?php

namespace App\Actions\Reviews;

use App\Enums\ReviewStatus;
use App\Models\Product;

/**
 * Recomputes a product's average rating and review count from its approved reviews, which is
 * what product cards and pages show. Saved quietly: it isn't an edit worth logging.
 */
class RefreshProductRating
{
    public function handle(Product $product): void
    {
        $totals = $product->reviews()->where('status', ReviewStatus::Approved)->toBase()
            ->selectRaw('count(*) as reviews, avg(rating) as average')
            ->first();

        $product->forceFill([
            'reviews_count' => (int) $totals->reviews,
            'rating_average' => $totals->reviews ? round((float) $totals->average, 2) : null,
        ])->saveQuietly();
    }
}
