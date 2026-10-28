<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Vendor\SaveSupplierRequest;
use App\Http\Resources\SupplierResource;
use App\Models\Supplier;
use App\Support\Purchasing\SupplierAccounts;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class SupplierController extends Controller
{
    /**
     * The store's suppliers by name, with their purchase order counts and what the store owes each, plus the
     * total owed to all of them.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate(['search' => ['nullable', 'string', 'max:100']]);
        $store = $request->user()->store;

        $suppliers = $store->suppliers()
            ->withCount(['purchaseOrders', 'openPurchaseOrders'])
            ->search($filters['search'] ?? null)
            ->orderBy('name')
            ->get();
        $accounts = SupplierAccounts::balances($store, $suppliers->modelKeys());
        $suppliers->each(fn (Supplier $supplier) => $supplier->setAttribute('account', $accounts[$supplier->id]));

        return SupplierResource::collection($suppliers)->additional([
            'total_due' => round(collect(SupplierAccounts::balances($store))->sum(fn (array $account): float => max(0, $account['balance'])), 2),
        ]);
    }

    public function store(SaveSupplierRequest $request): JsonResponse
    {
        $supplier = $request->user()->store->suppliers()->create($request->validated());

        return (new SupplierResource($supplier))->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(SaveSupplierRequest $request, Supplier $supplier): SupplierResource
    {
        $supplier->update($request->validated());

        return new SupplierResource($supplier);
    }

    /**
     * Only suppliers without purchase orders can be deleted, so history keeps its supplier.
     */
    public function destroy(Supplier $supplier): Response
    {
        Gate::authorize('delete', $supplier);

        if ($supplier->purchaseOrders()->exists() || $supplier->payments()->exists() || $supplier->purchaseReturns()->exists()) {
            throw ValidationException::withMessages(['supplier' => __('purchasing.supplier_has_orders')]);
        }

        $supplier->delete();

        return response()->noContent();
    }
}
