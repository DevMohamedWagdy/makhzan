<?php

namespace App\Http\Resources;

use App\Http\Resources\Concerns\IncludesStoreSummary;
use Illuminate\Http\Request;

/**
 * An affiliate payout in the admin panel, with its store.
 */
class AdminPayoutResource extends AffiliatePayoutResource
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
