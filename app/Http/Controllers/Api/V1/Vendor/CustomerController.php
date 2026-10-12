<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Vendor\ListCustomersRequest;
use App\Http\Resources\StoreCustomerResource;
use App\Models\Customer;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class CustomerController extends Controller
{
    /**
     * The store's shoppers with their order stats, searched and sorted.
     */
    public function index(ListCustomersRequest $request): AnonymousResourceCollection
    {
        $filters = $request->validated();

        $customers = $request->user()->store->customers()
            ->withOrderStats()
            ->search($filters['search'] ?? null)
            ->when($request->boolean('buyers'), fn ($query) => $query->has('orders'))
            ->when($filters['sort'] ?? 'recent', fn ($query, string $sort) => match ($sort) {
                'last_order' => $query->orderByRaw('last_order_at is null')->latest('last_order_at'),
                'orders' => $query->orderByDesc('orders_count'),
                'spent' => $query->orderByDesc('total_spent'),
                default => $query->latest(),
            })
            ->latest('id')
            ->paginate($filters['per_page'] ?? 20)
            ->withQueryString();

        return StoreCustomerResource::collection($customers);
    }

    /**
     * One customer with their address book; their orders come from the orders list (?customer_id=).
     */
    public function show(Customer $customer): StoreCustomerResource
    {
        Gate::authorize('view', $customer);

        return new StoreCustomerResource(
            Customer::query()->whereKey($customer->id)->withOrderStats()->with('addresses')->firstOrFail(),
        );
    }
}
