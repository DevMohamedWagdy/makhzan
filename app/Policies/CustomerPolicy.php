<?php

namespace App\Policies;

use App\Models\Customer;
use App\Models\Vendor;
use Illuminate\Auth\Access\Response;

class CustomerPolicy
{
    /**
     * A vendor may view only their own store's customers; others are reported as missing (404).
     */
    public function view(Vendor $vendor, Customer $customer): Response
    {
        return $vendor->store?->id === $customer->store_id
            ? Response::allow()
            : Response::denyAsNotFound(__('orders.customer_not_found'));
    }
}
