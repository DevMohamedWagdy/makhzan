<?php

namespace App\Policies;

use App\Models\Coupon;
use App\Models\Vendor;
use Illuminate\Auth\Access\Response;

class CouponPolicy
{
    /**
     * A vendor may manage only their own store's coupons; others are reported as missing (404).
     */
    public function view(Vendor $vendor, Coupon $coupon): Response
    {
        return $vendor->store?->id === $coupon->store_id
            ? Response::allow()
            : Response::denyAsNotFound(__('coupons.not_found'));
    }

    public function update(Vendor $vendor, Coupon $coupon): Response
    {
        return $this->view($vendor, $coupon);
    }

    public function delete(Vendor $vendor, Coupon $coupon): Response
    {
        return $this->view($vendor, $coupon);
    }
}
