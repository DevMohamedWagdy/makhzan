<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Actions\Inventory\TransferStock;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Vendor\StoreStockTransferRequest;
use App\Http\Resources\StockTransferResource;
use App\Models\StockTransfer;
use App\Models\Warehouse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

class StockTransferController extends Controller
{
    /**
     * The store's transfers between warehouses, newest first.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $request->validate(['page' => ['nullable', 'integer', 'min:1']]);

        return StockTransferResource::collection($request->user()->store->stockTransfers()->with('items')->latest('id')->paginate(20));
    }

    /**
     * Move stock between two warehouses right away.
     */
    public function store(StoreStockTransferRequest $request, TransferStock $transferStock): JsonResponse
    {
        $transfer = $transferStock->handle(
            $request->user()->store,
            Warehouse::query()->findOrFail($request->validated('from_warehouse_id')),
            Warehouse::query()->findOrFail($request->validated('to_warehouse_id')),
            $request->validated('items'),
            $request->validated('note'),
        );

        return (new StockTransferResource($transfer))->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(StockTransfer $transfer): StockTransferResource
    {
        Gate::authorize('view', $transfer);

        return new StockTransferResource($transfer->load('items'));
    }
}
