<?php

namespace App\Policies;

use App\Models\Vendor;
use App\Models\Warehouse;
use Illuminate\Auth\Access\Response;

class WarehousePolicy
{
    /**
     * A vendor may manage only their own store's warehouses; others are reported as missing (404).
     */
    public function update(Vendor $vendor, Warehouse $warehouse): Response
    {
        return $vendor->store?->id === $warehouse->store_id
            ? Response::allow()
            : Response::denyAsNotFound(__('inventory.warehouse_not_found'));
    }

    public function delete(Vendor $vendor, Warehouse $warehouse): Response
    {
        return $this->update($vendor, $warehouse);
    }
}
