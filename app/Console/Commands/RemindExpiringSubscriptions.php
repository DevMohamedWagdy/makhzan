<?php

namespace App\Console\Commands;

use App\Models\Admin;
use App\Models\Store;
use App\Notifications\AdminAlertNotification;
use App\Notifications\SubscriptionUpdateNotification;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('makhzan:remind-expiring-subscriptions')]
#[Description('Remind store owners whose paid plan or trial ends in makhzan.billing.expiry_reminder_days days')]
class RemindExpiringSubscriptions extends Command
{
    /**
     * Execute the console command. Runs daily, so each owner gets one reminder.
     */
    public function handle(): int
    {
        $day = now()->addDays(config('makhzan.billing.expiry_reminder_days'));
        $count = 0;

        Store::query()
            ->with(['vendor', 'plan'])
            ->whereNotNull('plan_id')
            ->whereBetween('plan_expires_at', [$day->copy()->startOfDay(), $day->copy()->endOfDay()])
            ->each(function (Store $store) use (&$count): void {
                $store->vendor->notify(new SubscriptionUpdateNotification(SubscriptionUpdateNotification::EXPIRING, $store->plan->name, $store->plan_expires_at));
                $count++;
            });

        Store::query()
            ->with('vendor')
            ->withoutActiveSubscription()
            ->whereBetween('trial_ends_at', [$day->copy()->startOfDay(), $day->copy()->endOfDay()])
            ->each(function (Store $store) use (&$count): void {
                $store->vendor->notify(new SubscriptionUpdateNotification(SubscriptionUpdateNotification::TRIAL_ENDING, __('billing.trial'), $store->trial_ends_at));
                $count++;
            });

        // Yesterday's trials that ended without a subscription: a sales follow-up for the team.
        Store::query()
            ->with('vendor')
            ->withoutActiveSubscription()
            ->whereBetween('trial_ends_at', [now()->subDay()->startOfDay(), now()->subDay()->endOfDay()])
            ->each(fn (Store $store) => Admin::notifyTeam(new AdminAlertNotification(AdminAlertNotification::TRIAL_ENDED, ['store_id' => $store->id, 'store_name' => $store->name, 'owner_name' => $store->vendor->full_name])));

        $this->info("Reminded {$count} store owner(s).");

        return self::SUCCESS;
    }
}
