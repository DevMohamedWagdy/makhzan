<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Actions\Inventory\ChangeStock;
use App\Enums\StockMovementType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Vendor\ListStockMovementsRequest;
use App\Http\Requests\Api\V1\Vendor\StoreStockMovementRequest;
use App\Http\Resources\InventoryItemResource;
use App\Http\Resources\StockMovementResource;
use App\Models\ProductVariant;
use App\Models\StockMovement;
use App\Models\Warehouse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Date;

class StockMovementController extends Controller
{
    /**
     * The store's stock movements, newest first, filtered by type, variant, warehouse, product or date.
     */
    public function index(ListStockMovementsRequest $request): AnonymousResourceCollection
    {
        $filters = $request->validated();
        $search = trim($filters['search'] ?? '');

        $movements = $request->user()->store->stockMovements()
            ->with(['order:id,number', 'purchaseOrder:id,number', 'transfer:id,number'])
            ->when($filters['type'] ?? null, fn ($query, $type) => $query->where('type', $type))
            ->when($filters['variant_id'] ?? null, fn ($query, $variantId) => $query->where('product_variant_id', $variantId))
            ->when($filters['warehouse_id'] ?? null, fn ($query, $warehouseId) => $query->where('warehouse_id', $warehouseId))
            ->when($search !== '', fn ($query) => $query->where('product_name', 'like', "%{$search}%"))
            ->when($filters['from'] ?? null, fn ($query, $from) => $query->where('created_at', '>=', Date::parse($from)->startOfDay()))
            ->when($filters['to'] ?? null, fn ($query, $to) => $query->where('created_at', '<=', Date::parse($to)->endOfDay()))
            ->latest('id')
            ->paginate($filters['per_page'] ?? 20)
            ->withQueryString();

        return StockMovementResource::collection($movements);
    }

    /**
     * Record a restock, a stock count or a write-off in a warehouse (the default one unless
     * given); returns the movement and the updated item.
     */
    public function store(StoreStockMovementRequest $request, ProductVariant $variant, ChangeStock $changeStock): JsonResponse
    {
        $type = StockMovementType::from($request->validated('type'));
        $quantity = (int) $request->validated('quantity');
        $note = $request->validated('note');
        $warehouse = $request->filled('warehouse_id') ? Warehouse::query()->find($request->validated('warehouse_id')) : null;

        $movement = $type === StockMovementType::Adjustment
            ? $changeStock->to($variant, $quantity, $type, StockMovement::ACTOR_VENDOR, $note, $warehouse)
            : $changeStock->by(
                $variant,
                $type === StockMovementType::Damage ? -$quantity : $quantity,
                $type,
                StockMovement::ACTOR_VENDOR,
                note: $note,
                unitCost: $type === StockMovementType::Restock && $request->filled('unit_cost') ? (float) $request->validated('unit_cost') : null,
                warehouse: $warehouse,
            );

        return response()->json([
            'movement' => $movement ? new StockMovementResource($movement) : null,
            'item' => new InventoryItemResource($variant->refresh()->load(['product.images', 'product.store.warehouses', 'warehouseStocks'])),
        ], $movement ? Response::HTTP_CREATED : Response::HTTP_OK);
    }
}
