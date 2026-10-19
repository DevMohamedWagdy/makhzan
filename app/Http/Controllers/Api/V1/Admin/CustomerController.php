<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminCustomerResource;
use App\Http\Resources\AdminOrderResource;
use App\Http\Resources\LoyaltyTransactionResource;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Shoppers of every store: searchable list and a profile with addresses, orders and points.
 */
class CustomerController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'store_id' => ['nullable', 'integer'],
            'buyers' => ['nullable', 'boolean'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $customers = Customer::query()
            ->with('store')
            ->withOrderStats()
            ->search($filters['search'] ?? null)
            ->when($filters['store_id'] ?? null, fn ($query, int $storeId) => $query->where('store_id', $storeId))
            ->when($request->boolean('buyers'), fn ($query) => $query->has('orders'))
            ->latest('id')
            ->paginate(30)
            ->withQueryString();

        return AdminCustomerResource::collection($customers);
    }

    public function show(Customer $customer): JsonResponse
    {
        $customer = Customer::query()->with(['store', 'addresses'])->withOrderStats()->findOrFail($customer->id);

        return response()->json([
            'data' => new AdminCustomerResource($customer),
            'orders' => AdminOrderResource::collection($customer->orders()->with('store')->withCount('items')->latest('id')->limit(20)->get()),
            'points' => LoyaltyTransactionResource::collection($customer->loyaltyTransactions()->latest('id')->limit(20)->get()),
        ]);
    }
}
