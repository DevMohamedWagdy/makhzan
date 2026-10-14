<?php

namespace App\Http\Resources;

use App\Models\Vendor;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Vendor
 */
class VendorResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'vendor_id' => $this->id,
            'full_name' => $this->full_name,
            'phone' => $this->phone,
            'email' => $this->email,
            'role' => $this->isOwner() ? 'owner' : 'staff',
            'permissions' => $this->grantedPermissions(),
            'created_at' => $this->created_at?->toIso8601String(),
            'store' => new StoreResource($this->whenLoaded('store')),
        ];
    }
}
