<?php

namespace App\Policies;

use App\Models\Supplier;
use App\Models\Vendor;
use Illuminate\Auth\Access\Response;

class SupplierPolicy
{
    /**
     * A vendor may manage only their own store's suppliers; others are reported as missing (404).
     */
    public function update(Vendor $vendor, Supplier $supplier): Response
    {
        return $vendor->store?->id === $supplier->store_id
            ? Response::allow()
            : Response::denyAsNotFound(__('purchasing.supplier_not_found'));
    }

    public function delete(Vendor $vendor, Supplier $supplier): Response
    {
        return $this->update($vendor, $supplier);
    }
}
