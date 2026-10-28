<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use App\Models\SupplierPayment;
use App\Support\Purchasing\SupplierAccounts;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

/**
 * A supplier's account: what the store received from them, returned and paid, and the balance it owes.
 */
class SupplierAccountController extends Controller
{
    /**
     * The balance with its parts and the statement (newest first).
     */
    public function show(Request $request, Supplier $supplier): JsonResponse
    {
        Gate::authorize('update', $supplier);

        return response()->json(['data' => [
            'supplier' => ['supplier_id' => $supplier->id, 'name' => $supplier->name, 'phone' => $supplier->phone],
            'account' => SupplierAccounts::balances($request->user()->store, [$supplier->id])[$supplier->id],
            'entries' => SupplierAccounts::statement($supplier),
        ]]);
    }

    public function storePayment(Request $request, Supplier $supplier): JsonResponse
    {
        Gate::authorize('update', $supplier);

        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01', 'max:100000000'],
            'paid_at' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'method' => ['required', Rule::in(SupplierPayment::METHODS)],
            'reference' => ['nullable', 'string', 'max:100'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $request->user()->store->supplierPayments()->create([...$validated, 'supplier_id' => $supplier->id, 'vendor_id' => $request->user()->id]);

        return $this->show($request, $supplier)->setStatusCode(Response::HTTP_CREATED);
    }

    /**
     * Removes a payment recorded by mistake.
     */
    public function destroyPayment(Request $request, Supplier $supplier, SupplierPayment $payment): JsonResponse
    {
        Gate::authorize('update', $supplier);
        abort_unless($payment->supplier_id === $supplier->id, Response::HTTP_NOT_FOUND);

        $payment->delete();

        return $this->show($request, $supplier);
    }
}
