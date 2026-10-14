<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Enums\BillingMethod;
use App\Enums\SubscriptionRequestStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Vendor\RequestSubscriptionRequest;
use App\Http\Resources\PlanResource;
use App\Http\Resources\SubscriptionPaymentResource;
use App\Http\Resources\SubscriptionRequestResource;
use App\Models\Admin;
use App\Models\Plan;
use App\Notifications\AdminAlertNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\ValidationException;

/**
 * The owner's subscription: current plan and usage, plans to upgrade to, where to pay, and
 * activation requests after paying.
 */
class SubscriptionController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $store = $request->user()->store;
        $plan = $store->currentPlan();

        return response()->json(['data' => [
            'billing' => $store->billingSummary(),
            'plan' => $plan ? new PlanResource($plan) : null,
            'usage' => [
                'products' => $store->products()->count(),
                'staff' => $store->staff()->count(),
            ],
            'plans' => PlanResource::collection(Plan::query()->where('is_active', true)->ordered()->get()),
            'pending_request' => ($pending = $store->subscriptionRequests()->with('plan')->where('status', SubscriptionRequestStatus::Pending)->latest('id')->first())
                ? new SubscriptionRequestResource($pending)
                : null,
            'payments' => SubscriptionPaymentResource::collection($store->subscriptionPayments()->latest('id')->limit(12)->get()),
            'payment_accounts' => collect(config('makhzan.billing.accounts'))
                ->filter()
                ->map(fn (string $account, string $method): array => ['method' => $method, 'label' => __("billing.methods.{$method}"), 'account' => $account])
                ->values(),
            'support_whatsapp' => config('makhzan.billing.support_whatsapp'),
        ]]);
    }

    /**
     * "I transferred the fee": queued for a platform admin to confirm and activate.
     */
    public function requestPlan(RequestSubscriptionRequest $request): JsonResponse
    {
        $store = $request->user()->store;

        if ($store->subscriptionRequests()->where('status', SubscriptionRequestStatus::Pending)->exists()) {
            throw ValidationException::withMessages(['plan_id' => __('billing.request_pending')]);
        }

        $plan = Plan::query()->findOrFail($request->integer('plan_id'));
        $months = $request->integer('months');

        $subscriptionRequest = $store->subscriptionRequests()->create([
            'plan_id' => $plan->id,
            'months' => $months,
            'amount' => $plan->priceFor($months),
            'method' => BillingMethod::from($request->validated('method')),
            'reference' => $request->validated('reference'),
            'notes' => $request->validated('notes'),
        ]);

        Admin::notifyTeam(new AdminAlertNotification(AdminAlertNotification::SUBSCRIPTION_REQUESTED, [
            'store_id' => $store->id,
            'store_name' => $store->name,
            'request_id' => $subscriptionRequest->id,
            'plan_name' => $plan->name,
            'amount' => $subscriptionRequest->amount,
        ]));

        return (new SubscriptionRequestResource($subscriptionRequest->refresh()->load('plan')))
            ->additional(['message' => __('billing.request_sent')])
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }
}
