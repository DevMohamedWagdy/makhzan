<?php

namespace App\Http\Resources;

use App\Models\AffiliateRegistrationLink;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * What a prospective affiliate may see about a store before joining. Deliberately
 * excludes vendor contact details and anything about existing affiliates.
 *
 * @mixin AffiliateRegistrationLink
 */
class AffiliateRegistrationLinkPublicResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'store' => [
                'name' => $this->store->name,
                'slug' => $this->store->slug,
                'logo_url' => $this->store->logo_url,
            ],
            'tier' => $this->default_tier,
            'commission_percentage' => $this->default_tier->defaultCommission(),
            'requires_approval' => ! $this->auto_approve,
        ];
    }
}
