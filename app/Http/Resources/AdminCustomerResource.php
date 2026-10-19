<?php

namespace App\Http\Resources;

use App\Http\Resources\Concerns\IncludesStoreSummary;
use Illuminate\Http\Request;

/**
 * A store customer in the admin panel: the store view plus which store they shop at.
 */
class AdminCustomerResource extends StoreCustomerResource
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
