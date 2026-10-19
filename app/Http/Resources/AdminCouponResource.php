<?php

namespace App\Http\Resources;

use App\Http\Resources\Concerns\IncludesStoreSummary;
use Illuminate\Http\Request;

/**
 * A coupon in the admin panel, with its store.
 */
class AdminCouponResource extends CouponResource
{
    use IncludesStoreSummary;

    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [...parent::toArray($request), 'store' => $this->storeSummary()];
    }
}
