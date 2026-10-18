<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Vendor\SaveStaffRequest;
use App\Http\Resources\StaffResource;
use App\Models\Vendor;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

/**
 * The owner's team: staff accounts that sign in to the same dashboard with limited sections.
 */
class StaffController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        return StaffResource::collection($request->user()->store->staff()->with('role')->oldest('id')->get());
    }

    /**
     * Adds a staff member with a password the owner shares with them.
     */
    public function store(SaveStaffRequest $request): StaffResource
    {
        $store = $request->user()->store;

        $staffMember = $store->staff()->create($request->safe()->only(['full_name', 'job_title', 'phone', 'email', 'password', 'role_id', 'is_active']));

        return new StaffResource($staffMember->refresh()->load('role'));
    }

    /**
     * Edits details and the role; a new password or deactivation signs them out everywhere.
     */
    public function update(SaveStaffRequest $request, Vendor $staffMember): StaffResource
    {
        $this->ensureWorksHere($request, $staffMember);

        $staffMember->fill($request->safe()->only(['full_name', 'job_title', 'phone', 'email', 'role_id', 'is_active']));

        if ($request->filled('password')) {
            $staffMember->password = $request->validated('password');
        }

        $signOut = $staffMember->isDirty('password') || ($staffMember->isDirty('is_active') && ! $staffMember->is_active);
        $staffMember->save();

        if ($signOut) {
            $staffMember->tokens()->delete();
        }

        return new StaffResource($staffMember->load('role'));
    }

    public function destroy(Request $request, Vendor $staffMember): Response
    {
        $this->ensureWorksHere($request, $staffMember);

        $staffMember->tokens()->delete();
        $staffMember->delete();

        return response()->noContent();
    }

    /**
     * Another store's staff (or any owner) is reported as missing so its existence isn't leaked.
     */
    private function ensureWorksHere(Request $request, Vendor $staffMember): void
    {
        abort_unless($staffMember->store_id === $request->user()->store->id, Response::HTTP_NOT_FOUND);
    }
}
