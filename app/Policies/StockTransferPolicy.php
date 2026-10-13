<?php

namespace App\Policies;

use App\Models\StockTransfer;
use App\Models\Vendor;
use Illuminate\Auth\Access\Response;

class StockTransferPolicy
{
    /**
     * A vendor may view only their own store's transfers; others are reported as missing (404).
     */
    public function view(Vendor $vendor, StockTransfer $transfer): Response
    {
        return $vendor->store?->id === $transfer->store_id
            ? Response::allow()
            : Response::denyAsNotFound(__('inventory.transfer_not_found'));
    }
}
