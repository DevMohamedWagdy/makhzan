<?php

namespace App\Policies;

use App\Models\Product;
use App\Models\Vendor;
use Illuminate\Auth\Access\Response;

class ProductPolicy
{
    /**
     * A vendor may view a product only if it belongs to their store.
     */
    public function view(Vendor $vendor, Product $product): Response
    {
        return $this->ownedByVendorStore($vendor, $product);
    }

    /**
     * A vendor may update a product only if it belongs to their store.
     */
    public function update(Vendor $vendor, Product $product): Response
    {
        return $this->ownedByVendorStore($vendor, $product);
    }

    /**
     * A vendor may delete a product only if it belongs to their store.
     */
    public function delete(Vendor $vendor, Product $product): Response
    {
        return $this->ownedByVendorStore($vendor, $product);
    }

    /**
     * Another store's product is reported as missing (404) so its existence isn't leaked.
     */
    private function ownedByVendorStore(Vendor $vendor, Product $product): Response
    {
        return $vendor->store?->id === $product->store_id
            ? Response::allow()
            : Response::denyAsNotFound('المنتج غير موجود');
    }
}
