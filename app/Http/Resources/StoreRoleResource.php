<?php

namespace App\Http\Resources;

use App\Models\StoreRole;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin StoreRole
 */
class StoreRoleResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'role_id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'permissions' => $this->permissions,
            'staff_count' => $this->whenCounted('staff'),
        ];
    }
}
