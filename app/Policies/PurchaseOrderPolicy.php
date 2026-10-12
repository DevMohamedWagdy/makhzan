<?php

namespace App\Policies;

use App\Models\PurchaseOrder;
use App\Models\Vendor;
use Illuminate\Auth\Access\Response;

class PurchaseOrderPolicy
{
    /**
     * A vendor may view only their own store's purchase orders; others are reported as missing (404).
     */
    public function view(Vendor $vendor, PurchaseOrder $purchaseOrder): Response
    {
        return $vendor->store?->id === $purchaseOrder->store_id
            ? Response::allow()
            : Response::denyAsNotFound(__('purchasing.not_found'));
    }

    public function update(Vendor $vendor, PurchaseOrder $purchaseOrder): Response
    {
        return $this->view($vendor, $purchaseOrder);
    }

    public function delete(Vendor $vendor, PurchaseOrder $purchaseOrder): Response
    {
        return $this->view($vendor, $purchaseOrder);
    }
}
