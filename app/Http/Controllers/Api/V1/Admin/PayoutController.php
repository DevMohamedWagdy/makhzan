<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\PayoutStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\AdminPayoutResource;
use App\Models\AffiliatePayout;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

/**
 * Affiliate payout requests and payments of every store.
 */
class PayoutController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'store_id' => ['nullable', 'integer'],
            'status' => ['nullable', Rule::enum(PayoutStatus::class)],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $query = AffiliatePayout::query()
            ->when($filters['store_id'] ?? null, fn ($query, int $storeId) => $query->where('store_id', $storeId));

        $counts = (clone $query)->toBase()->selectRaw('status, count(*) as total, coalesce(sum(amount), 0) as amount')->groupBy('status')->get()->keyBy('status');

        $payouts = $query
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->with(['store', 'affiliate'])
            ->latest('id')
            ->paginate(30)
            ->withQueryString();

        return AdminPayoutResource::collection($payouts)->additional(['summary' => collect(PayoutStatus::cases())->mapWithKeys(fn (PayoutStatus $status): array => [$status->value => [
            'count' => (int) ($counts[$status->value]->total ?? 0),
            'amount' => round((float) ($counts[$status->value]->amount ?? 0), 2),
        ]])]);
    }
}
