<?php

namespace App\Http\Controllers\Api\V1\Affiliate;

use App\Enums\CommissionStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\AffiliateOrderResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class OrderController extends Controller
{
    /**
     * Orders that came through the affiliate's links, newest first, with the commission
     * still expected from orders not delivered yet.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'commission_status' => ['nullable', Rule::enum(CommissionStatus::class)],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $orders = $request->user()->orders();

        return AffiliateOrderResource::collection(
            (clone $orders)
                ->with('items')
                ->when($filters['commission_status'] ?? null, fn ($query, $status) => $query->where('commission_status', $status))
                ->latest('id')
                ->paginate(15)
                ->withQueryString(),
        )->additional(['summary' => [
            'expected_commission' => (float) (clone $orders)->where('commission_status', CommissionStatus::Pending)->sum('commission_amount'),
            'expected_orders' => (clone $orders)->where('commission_status', CommissionStatus::Pending)->count(),
        ]]);
    }
}
