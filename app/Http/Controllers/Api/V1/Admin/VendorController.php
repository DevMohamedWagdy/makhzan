<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminVendorResource;
use App\Models\Vendor;
use App\Support\PhoneNumber;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Every dashboard account: store owners and their staff.
 */
class VendorController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'type' => ['nullable', Rule::in(['owner', 'staff'])],
            'store_id' => ['nullable', 'integer'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $vendors = Vendor::query()
            ->with(['ownedStore', 'employer', 'role'])
            ->when($filters['search'] ?? null, fn (Builder $query, string $term) => $query->where(fn (Builder $query) => $query->where('full_name', 'like', "%{$term}%")->orWhere('email', 'like', "%{$term}%")->orWhere('phone', 'like', '%'.PhoneNumber::normalize($term).'%')))
            ->when(($filters['type'] ?? null) === 'owner', fn (Builder $query) => $query->whereNull('store_id'))
            ->when(($filters['type'] ?? null) === 'staff', fn (Builder $query) => $query->whereNotNull('store_id'))
            ->when($filters['store_id'] ?? null, fn (Builder $query, int $storeId) => $query->where(fn (Builder $query) => $query->where('store_id', $storeId)->orWhereHas('ownedStore', fn (Builder $query) => $query->whereKey($storeId))))
            ->latest('id')
            ->paginate(30)
            ->withQueryString();

        return AdminVendorResource::collection($vendors);
    }

    /**
     * Edits an account; a new password or deactivation signs it out everywhere.
     */
    public function update(Request $request, Vendor $vendor): AdminVendorResource
    {
        $request->merge(array_filter([
            'phone' => $request->has('phone') ? PhoneNumber::normalize($request->input('phone')) : null,
            'email' => $request->has('email') ? Str::lower(trim((string) $request->input('email'))) : null,
        ]));

        $validated = $request->validate([
            'full_name' => ['sometimes', 'string', 'min:3', 'max:255'],
            'phone' => ['sometimes', 'regex:'.PhoneNumber::PATTERN, Rule::unique('vendors', 'phone')->ignore($vendor->id)],
            'email' => ['sometimes', 'email', 'max:255', Rule::unique('vendors', 'email')->ignore($vendor->id)],
            'password' => ['nullable', 'string', 'min:8', 'regex:/[A-Za-z]/', 'regex:/\d/'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $vendor->fill(collect($validated)->except('password')->all());

        if (filled($validated['password'] ?? null)) {
            $vendor->password = $validated['password'];
        }

        $signOut = $vendor->isDirty('password') || ($vendor->isDirty('is_active') && ! $vendor->is_active);
        $vendor->save();

        if ($signOut) {
            $vendor->tokens()->delete();
        }

        return new AdminVendorResource($vendor->load(['ownedStore', 'employer', 'role']));
    }
}
