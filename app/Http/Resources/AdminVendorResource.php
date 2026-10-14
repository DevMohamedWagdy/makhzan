<?php

namespace App\Http\Resources;

use App\Models\Vendor;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A dashboard account (store owner or staff) as the platform team sees it.
 *
 * @mixin Vendor
 */
class AdminVendorResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $store = $this->isOwner() ? $this->getRelationValue('ownedStore') : $this->getRelationValue('employer');

        return [
            'vendor_id' => $this->id,
            'full_name' => $this->full_name,
            'phone' => $this->phone,
            'email' => $this->email,
            'type' => $this->isOwner() ? 'owner' : 'staff',
            'role' => $this->role?->name,
            'is_active' => $this->is_active !== false,
            'store' => $store ? ['store_id' => $store->id, 'name' => $store->name, 'slug' => $store->slug] : null,
            'last_login_at' => $this->last_login_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
