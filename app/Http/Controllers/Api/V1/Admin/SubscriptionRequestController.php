<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Actions\Subscriptions\ActivateSubscription;
use App\Enums\SubscriptionRequestStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\SubscriptionRequestResource;
use App\Models\SubscriptionRequest;
use App\Notifications\SubscriptionUpdateNotification;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Vendors' "I paid" requests: approving activates the plan; rejecting tells the owner why.
 */
class SubscriptionRequestController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $status = $request->validate(['status' => ['nullable', Rule::enum(SubscriptionRequestStatus::class)]])['status'] ?? null;

        return SubscriptionRequestResource::collection(
            SubscriptionRequest::query()
                ->with(['plan', 'store'])
                ->when($status, fn ($query) => $query->where('status', $status))
                ->latest('id')
                ->paginate(20)
                ->withQueryString(),
        );
    }

    /**
     * Confirms the transfer: records the payment (the requested amount unless corrected)
     * and activates the plan.
     */
    public function approve(Request $request, SubscriptionRequest $subscriptionRequest, ActivateSubscription $activate): SubscriptionRequestResource
    {
        $this->ensurePending($subscriptionRequest);
        $amount = $request->validate(['amount' => ['nullable', 'numeric', 'min:0']])['amount'] ?? $subscriptionRequest->amount;

        $payment = $activate->handle(
            $subscriptionRequest->store,
            $subscriptionRequest->plan,
            $subscriptionRequest->months,
            (float) $amount,
            $subscriptionRequest->method,
            $subscriptionRequest->reference,
            $subscriptionRequest->notes,
            $request->user(),
        );

        $subscriptionRequest->forceFill([
            'status' => SubscriptionRequestStatus::Approved,
            'reviewed_at' => now(),
            'reviewed_by' => $request->user()->id,
            'subscription_payment_id' => $payment->id,
        ])->save();

        return new SubscriptionRequestResource($subscriptionRequest->load(['plan', 'store']));
    }

    public function reject(Request $request, SubscriptionRequest $subscriptionRequest): SubscriptionRequestResource
    {
        $this->ensurePending($subscriptionRequest);
        $note = $request->validate(['note' => ['required', 'string', 'max:255']])['note'];

        $subscriptionRequest->forceFill([
            'status' => SubscriptionRequestStatus::Rejected,
            'review_note' => $note,
            'reviewed_at' => now(),
            'reviewed_by' => $request->user()->id,
        ])->save();

        $subscriptionRequest->store->vendor->notify(new SubscriptionUpdateNotification(SubscriptionUpdateNotification::REJECTED, $subscriptionRequest->plan->name, note: $note));

        return new SubscriptionRequestResource($subscriptionRequest->load(['plan', 'store']));
    }

    private function ensurePending(SubscriptionRequest $subscriptionRequest): void
    {
        if ($subscriptionRequest->status !== SubscriptionRequestStatus::Pending) {
            throw ValidationException::withMessages(['status' => __('billing.request_not_pending')]);
        }
    }
}
