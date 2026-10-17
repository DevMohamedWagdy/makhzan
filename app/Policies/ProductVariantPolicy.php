<?php

namespace App\Policies;

use App\Models\ProductVariant;
use App\Models\Vendor;
use Illuminate\Auth\Access\Response;

class ProductVariantPolicy
{
    /**
     * A vendor may change a variant's stock, cost or threshold only in their own store;
     * another store's variant is reported as missing (404).
     */
    public function update(Vendor $vendor, ProductVariant $variant): Response
    {
        // The product is null when it belongs to another store: the store scope hides it.
        $productStoreId = $variant->product?->store_id;

        return $productStoreId !== null && $vendor->store?->id === $productStoreId
            ? Response::allow()
            : Response::denyAsNotFound(__('inventory.variant_not_found'));
    }
}
