<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Actions\Loyalty\ChangePoints;
use App\Enums\LoyaltyTransactionType;
use App\Http\Controllers\Controller;
use App\Http\Resources\LoyaltyTransactionResource;
use App\Models\Customer;
use App\Models\OrderEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

class CustomerPointsController extends Controller
{
    /**
     * A customer's points history, newest first, with their tier and progress to the next one.
     */
    public function index(Customer $customer): AnonymousResourceCollection
    {
        Gate::authorize('view', $customer);

        return LoyaltyTransactionResource::collection($customer->loyaltyTransactions()->with('order')->latest('id')->paginate(20))
            ->additional([
                'balance' => $customer->points_balance,
                'tier' => $customer->store->tierProgress($customer->deliveredSpend()),
            ]);
    }

    /**
     * Gives or takes points by hand (a gift, a goodwill gesture, a correction), with a reason.
     */
    public function store(Request $request, Customer $customer, ChangePoints $changePoints): JsonResponse
    {
        Gate::authorize('view', $customer);

        $input = $request->validate([
            'points' => ['required', 'integer', 'not_in:0', 'between:-1000000,1000000'],
            'note' => ['required', 'string', 'max:200'],
        ], ['note.required' => __('loyalty.adjustment_note_required')]);

        $transaction = $changePoints->handle($customer, $input['points'], LoyaltyTransactionType::Adjusted, OrderEvent::ACTOR_VENDOR, note: $input['note']);

        return response()->json([
            'balance' => $customer->fresh()->points_balance,
            'transaction' => $transaction ? new LoyaltyTransactionResource($transaction) : null,
        ], Response::HTTP_CREATED);
    }
}
