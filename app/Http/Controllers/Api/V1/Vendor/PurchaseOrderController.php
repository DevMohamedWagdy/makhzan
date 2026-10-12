<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Actions\Purchasing\ReceivePurchaseOrder;
use App\Actions\Purchasing\SavePurchaseOrder;
use App\Enums\PurchaseOrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Vendor\ListPurchaseOrdersRequest;
use App\Http\Requests\Api\V1\Vendor\ReceivePurchaseOrderRequest;
use App\Http\Requests\Api\V1\Vendor\SavePurchaseOrderRequest;
use App\Http\Resources\PurchaseOrderResource;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class PurchaseOrderController extends Controller
{
    /**
     * The store's purchase orders, newest first, by status, supplier or number, with
     * status-tab counts and the value still on order.
     */
    public function index(ListPurchaseOrdersRequest $request): AnonymousResourceCollection
    {
        $filters = $request->validated();
        $store = $request->user()->store;
        $search = trim($filters['search'] ?? '', " \t#");

        $purchaseOrders = $store->purchaseOrders()
            ->with(['supplier', 'items'])
            ->when($filters['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->when($filters['supplier_id'] ?? null, fn ($query, $supplierId) => $query->where('supplier_id', $supplierId))
            ->when($search !== '', fn ($query) => $query->where(fn ($query) => $query
                ->when(ctype_digit($search), fn ($query) => $query->orWhere('number', (int) $search))
                ->orWhereHas('supplier', fn ($query) => $query->where('name', 'like', "%{$search}%"))))
            ->latest('id')
            ->paginate($filters['per_page'] ?? 20)
            ->withQueryString();

        $counts = $store->purchaseOrders()->toBase()->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');

        $onOrder = PurchaseOrderItem::query()
            ->whereHas('purchaseOrder', fn ($query) => $query->where('store_id', $store->id)->whereIn('status', [PurchaseOrderStatus::Ordered, PurchaseOrderStatus::Partial]))
            ->toBase()
            ->selectRaw('coalesce(sum(quantity_ordered - quantity_received), 0) as units, coalesce(sum((quantity_ordered - quantity_received) * unit_cost), 0) as value')
            ->first();

        return PurchaseOrderResource::collection($purchaseOrders)->additional(['summary' => [
            ...collect(PurchaseOrderStatus::cases())->mapWithKeys(fn (PurchaseOrderStatus $status): array => [$status->value => (int) ($counts[$status->value] ?? 0)]),
            'total' => (int) $counts->sum(),
            'units_on_order' => (int) $onOrder->units,
            'value_on_order' => round((float) $onOrder->value, 2),
        ]]);
    }

    public function store(SavePurchaseOrderRequest $request, SavePurchaseOrder $savePurchaseOrder): JsonResponse
    {
        $purchaseOrder = $savePurchaseOrder->handle($request->user()->store, $request->validated());

        return (new PurchaseOrderResource($purchaseOrder))->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(PurchaseOrder $purchaseOrder): PurchaseOrderResource
    {
        Gate::authorize('view', $purchaseOrder);

        return new PurchaseOrderResource($purchaseOrder->load(['supplier', 'items']));
    }

    /**
     * Change the supplier, dates, notes or items while nothing has been received.
     */
    public function update(SavePurchaseOrderRequest $request, PurchaseOrder $purchaseOrder, SavePurchaseOrder $savePurchaseOrder): PurchaseOrderResource
    {
        return new PurchaseOrderResource($savePurchaseOrder->handle($request->user()->store, $request->validated(), $purchaseOrder));
    }

    /**
     * Drafts only; anything sent to the supplier is cancelled instead, to keep its history.
     */
    public function destroy(PurchaseOrder $purchaseOrder): Response
    {
        Gate::authorize('delete', $purchaseOrder);

        if ($purchaseOrder->status !== PurchaseOrderStatus::Draft) {
            throw ValidationException::withMessages(['status' => __('purchasing.cannot_delete')]);
        }

        $purchaseOrder->delete();

        return response()->noContent();
    }

    /**
     * Mark a draft as sent to the supplier.
     */
    public function markOrdered(PurchaseOrder $purchaseOrder): PurchaseOrderResource
    {
        return $this->transition($purchaseOrder, [PurchaseOrderStatus::Draft], PurchaseOrderStatus::Ordered, 'ordered_at', 'purchasing.cannot_order');
    }

    /**
     * Cancel an order nothing was received against.
     */
    public function cancel(PurchaseOrder $purchaseOrder): PurchaseOrderResource
    {
        return $this->transition($purchaseOrder, [PurchaseOrderStatus::Draft, PurchaseOrderStatus::Ordered], PurchaseOrderStatus::Cancelled, 'cancelled_at', 'purchasing.cannot_cancel');
    }

    /**
     * Stop waiting for the rest of a partly received order.
     */
    public function close(PurchaseOrder $purchaseOrder): PurchaseOrderResource
    {
        return $this->transition($purchaseOrder, [PurchaseOrderStatus::Partial], PurchaseOrderStatus::Closed, 'closed_at', 'purchasing.cannot_close');
    }

    /**
     * Record goods that arrived (all or part); they're added to stock at the order's costs.
     */
    public function receive(ReceivePurchaseOrderRequest $request, PurchaseOrder $purchaseOrder, ReceivePurchaseOrder $receivePurchaseOrder): PurchaseOrderResource
    {
        return new PurchaseOrderResource($receivePurchaseOrder->handle($purchaseOrder, $request->quantities(), $request->validated('note')));
    }

    /**
     * @param  list<PurchaseOrderStatus>  $from
     *
     * @throws ValidationException
     */
    private function transition(PurchaseOrder $purchaseOrder, array $from, PurchaseOrderStatus $to, string $timestamp, string $error): PurchaseOrderResource
    {
        Gate::authorize('update', $purchaseOrder);

        if (! in_array($purchaseOrder->status, $from, true)) {
            throw ValidationException::withMessages(['status' => __($error)]);
        }

        $purchaseOrder->forceFill(['status' => $to, $timestamp => now()])->save();

        return new PurchaseOrderResource($purchaseOrder->load(['supplier', 'items']));
    }
}
