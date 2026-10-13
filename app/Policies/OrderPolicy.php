<?php

namespace App\Policies;

use App\Models\Order;
use App\Models\Vendor;
use Illuminate\Auth\Access\Response;

class OrderPolicy
{
    /**
     * A vendor may view an order only if it was placed in their store.
     */
    public function view(Vendor $vendor, Order $order): Response
    {
        return $this->ownedByVendorStore($vendor, $order);
    }

    /**
     * A vendor may change an order's status only if it was placed in their store.
     */
    public function update(Vendor $vendor, Order $order): Response
    {
        return $this->ownedByVendorStore($vendor, $order);
    }

    /**
     * Another store's order is reported as missing (404) so its existence isn't leaked.
     */
    private function ownedByVendorStore(Vendor $vendor, Order $order): Response
    {
        return $vendor->store?->id === $order->store_id
            ? Response::allow()
            : Response::denyAsNotFound(__('orders.not_found'));
    }
}
