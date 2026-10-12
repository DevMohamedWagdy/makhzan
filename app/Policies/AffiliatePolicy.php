<?php

namespace App\Policies;

use App\Models\Affiliate;
use App\Models\Vendor;
use Illuminate\Auth\Access\Response;

class AffiliatePolicy
{
    /**
     * A vendor may view an affiliate only if it belongs to their store.
     */
    public function view(Vendor $vendor, Affiliate $affiliate): Response
    {
        return $this->ownedByVendorStore($vendor, $affiliate);
    }

    /**
     * A vendor may update an affiliate only if it belongs to their store.
     */
    public function update(Vendor $vendor, Affiliate $affiliate): Response
    {
        return $this->ownedByVendorStore($vendor, $affiliate);
    }

    /**
     * A vendor may delete an affiliate only if it belongs to their store.
     */
    public function delete(Vendor $vendor, Affiliate $affiliate): Response
    {
        return $this->ownedByVendorStore($vendor, $affiliate);
    }

    /**
     * A vendor may log in as an affiliate of their store once the affiliate is approved.
     */
    public function impersonate(Vendor $vendor, Affiliate $affiliate): Response
    {
        return $this->ownedByVendorStore($vendor, $affiliate);
    }

    /**
     * Another store's affiliate is reported as missing (404) so its existence isn't leaked.
     */
    private function ownedByVendorStore(Vendor $vendor, Affiliate $affiliate): Response
    {
        return $vendor->store?->id === $affiliate->store_id
            ? Response::allow()
            : Response::denyAsNotFound(__('affiliates.not_found'));
    }
}
