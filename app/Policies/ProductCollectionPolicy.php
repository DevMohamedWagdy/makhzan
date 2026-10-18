<?php

namespace App\Policies;

use App\Models\ProductCollection;
use App\Models\Vendor;
use Illuminate\Auth\Access\Response;

class ProductCollectionPolicy
{
    /**
     * A vendor may view a collection only if it belongs to their store.
     */
    public function view(Vendor $vendor, ProductCollection $collection): Response
    {
        return $this->ownedByVendorStore($vendor, $collection);
    }

    /**
     * A vendor may update a collection (and its products) only if it belongs to their store.
     */
    public function update(Vendor $vendor, ProductCollection $collection): Response
    {
        return $this->ownedByVendorStore($vendor, $collection);
    }

    /**
     * A vendor may delete a collection only if it belongs to their store.
     */
    public function delete(Vendor $vendor, ProductCollection $collection): Response
    {
        return $this->ownedByVendorStore($vendor, $collection);
    }

    /**
     * Another store's collection is reported as missing (404) so its existence isn't leaked.
     */
    private function ownedByVendorStore(Vendor $vendor, ProductCollection $collection): Response
    {
        return $vendor->store?->id === $collection->store_id
            ? Response::allow()
            : Response::denyAsNotFound(__('products.collection_not_found'));
    }
}
