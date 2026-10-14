<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminTeamMemberResource;
use App\Models\Admin;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * The platform team: admins with a role (or super admins with everything).
 */
class TeamController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return AdminTeamMemberResource::collection(Admin::query()->with('role')->oldest('id')->get());
    }

    public function store(Request $request): AdminTeamMemberResource
    {
        $admin = Admin::query()->create($this->validated($request));

        return new AdminTeamMemberResource($admin->refresh()->load('role'));
    }

    /**
     * Edits a member; a new password or deactivation signs them out everywhere. Nobody can
     * lock the team out: you can't deactivate or demote yourself or the last super admin.
     */
    public function update(Request $request, Admin $admin): AdminTeamMemberResource
    {
        $validated = $this->validated($request, $admin);
        $admin->fill(collect($validated)->except('password')->all());

        if (filled($validated['password'] ?? null)) {
            $admin->password = $validated['password'];
        }

        $losesAccess = ($admin->isDirty('is_active') && ! $admin->is_active) || ($admin->isDirty('is_super') && ! $admin->is_super);

        if ($losesAccess && ($admin->is($request->user()) || $this->isLastSuper($admin))) {
            throw ValidationException::withMessages(['is_active' => __('auth.admin_keep_access')]);
        }

        $signOut = $admin->isDirty('password') || ($admin->isDirty('is_active') && ! $admin->is_active);
        $admin->save();

        if ($signOut) {
            $admin->tokens()->delete();
        }

        return new AdminTeamMemberResource($admin->load('role'));
    }

    public function destroy(Request $request, Admin $admin): Response
    {
        if ($admin->is($request->user()) || $this->isLastSuper($admin)) {
            throw ValidationException::withMessages(['admin' => __('auth.admin_keep_access')]);
        }

        $admin->tokens()->delete();
        $admin->delete();

        return response()->noContent();
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?Admin $admin = null): array
    {
        $request->merge(['email' => Str::lower(trim((string) $request->input('email')))]);

        $validated = $request->validate([
            'full_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('admins', 'email')->ignore($admin?->id)],
            'password' => [$admin ? 'nullable' : 'required', 'string', 'min:10'],
            'is_super' => ['boolean'],
            'is_active' => ['boolean'],
            'role_id' => ['nullable', 'required_unless:is_super,true', 'integer', Rule::exists('admin_roles', 'id')],
        ]);

        if ($validated['is_super'] ?? false) {
            $validated['role_id'] = null;
        }

        return $validated;
    }

    private function isLastSuper(Admin $admin): bool
    {
        return $admin->getOriginal('is_super') && Admin::query()->where('is_super', true)->where('is_active', true)->whereKeyNot($admin->id)->doesntExist();
    }
}
