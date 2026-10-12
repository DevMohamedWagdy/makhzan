<?php

namespace App\Http\Resources;

use App\Models\AffiliateRegistrationLink;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin AffiliateRegistrationLink
 */
class RegistrationLinkResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'store_id' => $this->store_id,
            'token' => $this->token,
            'url' => $this->store->storefrontUrl('/affiliates/join?t='.$this->token),
            'is_enabled' => $this->is_enabled,
            'auto_approve' => $this->auto_approve,
            'default_tier' => $this->default_tier,
        ];
    }
}
