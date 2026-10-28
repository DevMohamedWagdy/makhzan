<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Actions\Purchasing\CreatePurchaseReturn;
use App\Http\Controllers\Controller;
use App\Models\Supplier;
use App\Models\Warehouse;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

/**
 * Goods sent back to a supplier: out of one warehouse, credited to the supplier's account.
 */
class PurchaseReturnController extends Controller
{
    public function store(Request $request, Supplier $supplier, CreatePurchaseReturn $createReturn): JsonResponse
    {
        Gate::authorize('update', $supplier);
        $storeId = $request->user()->store->id;

        $validated = $request->validate([
            'warehouse_id' => ['required', 'integer', Rule::exists('warehouses', 'id')->where('store_id', $storeId)],
            'note' => ['nullable', 'string', 'max:500'],
            'items' => ['required', 'array', 'min:1', 'max:200'],
            'items.*.variant_id' => [
                'required', 'integer', 'distinct',
                Rule::exists('product_variants', 'id')->where(fn (Builder $query) => $query->whereIn('product_id', fn (Builder $query) => $query->select('id')->from('products')->where('store_id', $storeId))),
            ],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:1000000'],
            'items.*.unit_cost' => ['required', 'numeric', 'min:0', 'max:10000000'],
        ]);

        $return = $createReturn->handle(
            $request->user()->store,
            $supplier,
            Warehouse::query()->findOrFail($validated['warehouse_id']),
            $validated['items'],
            $validated['note'] ?? null,
            $request->user(),
        );

        return response()->json(['data' => [
            'purchase_return_id' => $return->id,
            'number' => $return->number,
            'total' => (float) $return->total,
            'items_count' => $return->items->count(),
        ]], Response::HTTP_CREATED);
    }
}
