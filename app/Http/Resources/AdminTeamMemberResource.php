<?php

namespace App\Http\Resources;

use App\Models\Admin;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A platform team member as the team manager sees them.
 *
 * @mixin Admin
 */
class AdminTeamMemberResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'admin_id' => $this->id,
            'full_name' => $this->full_name,
            'email' => $this->email,
            'is_super' => $this->is_super,
            'is_active' => $this->is_active !== false,
            'role' => $this->role ? ['role_id' => $this->role->id, 'name' => $this->role->name] : null,
            'permissions' => $this->grantedPermissions(),
            'last_login_at' => $this->last_login_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
