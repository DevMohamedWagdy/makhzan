<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\AdminPaymentResource;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

/**
 * Online payments taken by every store, with totals for the filtered set.
 */
class PaymentController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'store_id' => ['nullable', 'integer'],
            'status' => ['nullable', Rule::enum(PaymentStatus::class)],
            'search' => ['nullable', 'string', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $query = Payment::query()
            ->when($filters['store_id'] ?? null, fn ($query, int $storeId) => $query->where('store_id', $storeId))
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->when($filters['search'] ?? null, fn ($query, string $term) => $query->where(fn ($query) => $query
                ->where('gateway_transaction_id', 'like', "%{$term}%")
                ->orWhereHas('order', fn ($query) => $query->search($term))));

        $totals = (clone $query)->toBase()
            ->selectRaw('coalesce(sum(case when status != ? then amount else 0 end), 0) as collected, coalesce(sum(refunded_amount), 0) as refunded', [PaymentStatus::Pending->value])
            ->first();

        $payments = $query->with(['store', 'order'])->latest('id')->paginate(30)->withQueryString();

        return AdminPaymentResource::collection($payments)->additional(['summary' => [
            'collected' => round((float) $totals->collected, 2),
            'refunded' => round((float) $totals->refunded, 2),
        ]]);
    }
}
