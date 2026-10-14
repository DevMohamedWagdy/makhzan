<?php

namespace App\Http\Resources;

use App\Models\Vendor;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A staff member of the owner's store, as the owner manages them.
 *
 * @mixin Vendor
 */
class StaffResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'staff_id' => $this->id,
            'full_name' => $this->full_name,
            'phone' => $this->phone,
            'email' => $this->email,
            'role' => $this->whenLoaded('role', fn (): ?array => $this->role ? ['role_id' => $this->role->id, 'name' => $this->role->name] : null),
            'permissions' => $this->grantedPermissions(),
            'is_active' => $this->is_active,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
