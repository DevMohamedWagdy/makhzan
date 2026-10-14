<?php

namespace App\Actions\Subscriptions;

use App\Enums\BillingMethod;
use App\Models\Admin;
use App\Models\Plan;
use App\Models\Store;
use App\Models\SubscriptionPayment;
use App\Notifications\SubscriptionUpdateNotification;
use Illuminate\Support\Facades\DB;

/**
 * Records a subscription payment and puts the store on the plan for the paid period.
 * Renewing the current plan extends it from its expiry; switching plans starts now.
 */
class ActivateSubscription
{
    public function handle(Store $store, Plan $plan, int $months, float $amount, BillingMethod $method, ?string $reference = null, ?string $notes = null, ?Admin $admin = null): SubscriptionPayment
    {
        $payment = DB::transaction(function () use ($store, $plan, $months, $amount, $method, $reference, $notes, $admin): SubscriptionPayment {
            $store = Store::query()->whereKey($store->id)->lockForUpdate()->firstOrFail();
            $startsAt = $store->hasActiveSubscription() && $store->plan_id === $plan->id ? $store->plan_expires_at : now();
            $endsAt = $startsAt->copy()->addMonthsNoOverflow($months);

            $payment = $store->subscriptionPayments()->create([
                'plan_id' => $plan->id,
                'plan_name' => $plan->name,
                'amount' => $amount,
                'months' => $months,
                'method' => $method,
                'reference' => $reference,
                'notes' => $notes,
                'starts_at' => $startsAt,
                'ends_at' => $endsAt,
                'recorded_by' => $admin?->id,
            ]);

            $store->forceFill(['plan_id' => $plan->id, 'plan_expires_at' => $endsAt])->save();

            return $payment;
        });

        $store->vendor->notify(new SubscriptionUpdateNotification(SubscriptionUpdateNotification::ACTIVATED, $plan->name, $payment->ends_at));

        return $payment;
    }
}
