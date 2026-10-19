<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\AdminStoreResource;
use App\Http\Resources\VendorResource;
use App\Models\Store;
use App\Models\Vendor;
use App\Notifications\StoreAlertNotification;
use App\Support\ActivityLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

/**
 * Every store on the platform: search, inspect and suspend.
 */
class StoreController extends Controller
{
    /**
     * Stores, newest first, searched by store name/slug or owner name/email/phone and
     * filtered by status (active, suspended).
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', Rule::in(['active', 'suspended'])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $stores = $this->withActivity(Store::query())
            ->when($filters['search'] ?? null, function (Builder $query, string $term): void {
                $query->where(fn (Builder $query) => $query
                    ->where('name', 'like', "%{$term}%")
                    ->orWhere('slug', 'like', "%{$term}%")
                    ->orWhereHas('vendor', fn (Builder $query) => $query->where('full_name', 'like', "%{$term}%")->orWhere('email', 'like', "%{$term}%")->orWhere('phone', 'like', "%{$term}%")));
            })
            ->when($filters['status'] ?? null, fn (Builder $query, string $status) => match ($status) {
                'active' => $query->whereNull('suspended_at'),
                'suspended' => $query->whereNotNull('suspended_at'),
            })
            ->latest('id')
            ->paginate($filters['per_page'] ?? 20)
            ->withQueryString();

        return AdminStoreResource::collection($stores);
    }

    public function show(Store $store): AdminStoreResource
    {
        $store = $this->withActivity(Store::query())->findOrFail($store->id);

        return new AdminStoreResource($store);
    }

    /**
     * Edits what the platform may change on a store: its name and whether it takes orders.
     */
    public function update(Request $request, Store $store): AdminStoreResource
    {
        $store->update($request->validate([
            'name' => ['sometimes', 'string', 'min:2', 'max:255'],
            'accepting_orders' => ['sometimes', 'boolean'],
            'closed_message' => ['sometimes', 'nullable', 'string', 'max:200'],
        ]));

        return $this->show($store);
    }

    /**
     * A one-hour dashboard session as the store's owner, for support. Logged.
     */
    public function impersonate(Request $request, Store $store): JsonResponse
    {
        $owner = $store->vendor;
        $token = $owner->createToken('admin-impersonation:'.$request->user()->id, [Vendor::TOKEN_ABILITY], now()->addHour())->plainTextToken;

        ActivityLogger::log('store.impersonated', $store, storeId: $store->id);

        return response()->json(['token' => $token, 'vendor' => new VendorResource($owner->withStore())]);
    }

    /**
     * Closes the storefront and the dashboard until unsuspended.
     */
    public function suspend(Request $request, Store $store): AdminStoreResource
    {
        $reason = $request->validate(['reason' => ['required', 'string', 'max:255']])['reason'];

        $store->forceFill(['suspended_at' => now(), 'suspension_reason' => $reason])->save();
        $store->vendor->tokens()->delete();
        $store->staff()->each(fn ($staffMember) => $staffMember->tokens()->delete());
        $store->vendor->notify(new StoreAlertNotification(StoreAlertNotification::STORE_SUSPENDED, ['reason' => $reason]));

        return $this->show($store);
    }

    public function unsuspend(Store $store): AdminStoreResource
    {
        $wasSuspended = $store->isSuspended();
        $store->forceFill(['suspended_at' => null, 'suspension_reason' => null])->save();

        if ($wasSuspended) {
            $store->vendor->notify(new StoreAlertNotification(StoreAlertNotification::STORE_REACTIVATED));
        }

        return $this->show($store);
    }

    /**
     * @param  Builder<Store>  $query
     * @return Builder<Store>
     */
    private function withActivity(Builder $query): Builder
    {
        return $query
            ->with('vendor')
            ->withCount(['products', 'orders', 'staff'])
            ->withSum(['orders as delivered_sales' => fn (Builder $query) => $query->where('status', OrderStatus::Delivered)], 'total')
            ->withMax('orders', 'created_at');
    }
}
