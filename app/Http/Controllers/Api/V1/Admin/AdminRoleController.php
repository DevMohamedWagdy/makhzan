<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminRoleResource;
use App\Models\AdminRole;
use App\Support\AdminPermissions;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Roles for the platform team: named sets of admin panel permissions.
 */
class AdminRoleController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return AdminRoleResource::collection(AdminRole::query()->withCount('admins')->oldest('id')->get())
            ->additional(['catalog' => AdminPermissions::CATALOG]);
    }

    public function store(Request $request): AdminRoleResource
    {
        return new AdminRoleResource(AdminRole::query()->create($this->validated($request))->loadCount('admins'));
    }

    public function update(Request $request, AdminRole $role): AdminRoleResource
    {
        $role->update($this->validated($request, $role));

        return new AdminRoleResource($role->loadCount('admins'));
    }

    public function destroy(AdminRole $role): Response
    {
        if ($role->admins()->exists()) {
            throw ValidationException::withMessages(['role' => __('forms.role_in_use')]);
        }

        $role->delete();

        return response()->noContent();
    }

    /**
     * @return array{name: string, description: string|null, permissions: list<string>}
     */
    private function validated(Request $request, ?AdminRole $role = null): array
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:60', Rule::unique('admin_roles', 'name')->ignore($role?->id)],
            'description' => ['nullable', 'string', 'max:255'],
            'permissions' => ['present', 'array'],
            'permissions.*' => ['distinct', Rule::in(AdminPermissions::all())],
        ]);

        // Any action implies seeing its section.
        $permissions = $validated['permissions'];

        foreach ($validated['permissions'] as $permission) {
            $view = strtok($permission, '.').'.view';

            if (in_array($view, AdminPermissions::all(), true)) {
                $permissions[] = $view;
            }
        }

        return [...$validated, 'permissions' => array_values(array_intersect(AdminPermissions::all(), array_unique($permissions)))];
    }
}
