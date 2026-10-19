<?php

namespace App\Http\Resources;

use App\Http\Resources\Concerns\IncludesStoreSummary;
use Illuminate\Http\Request;

/**
 * A product in the admin panel: the store view plus which store sells it.
 */
class AdminProductResource extends ProductResource
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
