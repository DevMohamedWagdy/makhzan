<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Vendor\SaveStoreRoleRequest;
use App\Http\Resources\StoreRoleResource;
use App\Models\StoreRole;
use App\Support\StorePermissions;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Validation\ValidationException;

/**
 * The owner's staff roles: named sets of "section.action" permissions.
 */
class StoreRoleController extends Controller
{
    /**
     * The store's roles, plus the permission catalog the role form is built from.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        return StoreRoleResource::collection($request->user()->store->roles()->withCount('staff')->oldest('id')->get())
            ->additional(['catalog' => StorePermissions::CATALOG]);
    }

    public function store(SaveStoreRoleRequest $request): StoreRoleResource
    {
        $role = $request->user()->store->roles()->create([...$request->safe()->only(['name', 'description']), 'permissions' => $request->permissions()]);

        return new StoreRoleResource($role->loadCount('staff'));
    }

    public function update(SaveStoreRoleRequest $request, StoreRole $role): StoreRoleResource
    {
        $this->ensureBelongsToStore($request, $role);

        $role->update([...$request->safe()->only(['name', 'description']), 'permissions' => $request->permissions()]);

        return new StoreRoleResource($role->loadCount('staff'));
    }

    public function destroy(Request $request, StoreRole $role): Response
    {
        $this->ensureBelongsToStore($request, $role);

        if ($role->staff()->exists()) {
            throw ValidationException::withMessages(['role' => __('forms.role_in_use')]);
        }

        $role->delete();

        return response()->noContent();
    }

    private function ensureBelongsToStore(Request $request, StoreRole $role): void
    {
        abort_unless($role->store_id === $request->user()->store->id, Response::HTTP_NOT_FOUND);
    }
}
