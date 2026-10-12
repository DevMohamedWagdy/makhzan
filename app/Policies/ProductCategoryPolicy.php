<?php

namespace App\Policies;

use App\Models\ProductCategory;
use App\Models\Vendor;
use Illuminate\Auth\Access\Response;

class ProductCategoryPolicy
{
    /**
     * A vendor may view a category only if it belongs to their store.
     */
    public function view(Vendor $vendor, ProductCategory $category): Response
    {
        return $this->ownedByVendorStore($vendor, $category);
    }

    /**
     * A vendor may update a category only if it belongs to their store.
     */
    public function update(Vendor $vendor, ProductCategory $category): Response
    {
        return $this->ownedByVendorStore($vendor, $category);
    }

    /**
     * A vendor may delete a category only if it belongs to their store.
     */
    public function delete(Vendor $vendor, ProductCategory $category): Response
    {
        return $this->ownedByVendorStore($vendor, $category);
    }

    /**
     * Another store's category is reported as missing (404) so its existence isn't leaked.
     */
    private function ownedByVendorStore(Vendor $vendor, ProductCategory $category): Response
    {
        return $vendor->store?->id === $category->store_id
            ? Response::allow()
            : Response::denyAsNotFound('القسم غير موجود');
    }
}
