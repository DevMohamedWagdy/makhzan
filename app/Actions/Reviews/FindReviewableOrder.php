<?php

namespace App\Actions\Reviews;

use App\Enums\OrderStatus;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;

/**
 * The customer's latest delivered order containing the product: only buyers who received a
 * product may review it.
 */
class FindReviewableOrder
{
    public function handle(Customer $customer, Product $product): ?Order
    {
        return $customer->orders()
            ->where('status', OrderStatus::Delivered)
            ->whereHas('items', fn ($query) => $query->where('product_id', $product->id))
            ->latest('delivered_at')
            ->first();
    }
}
